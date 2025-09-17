import {spawn, ChildProcess} from 'child_process';
import {promisify} from 'util';
import {writeFileSync, unlinkSync} from 'fs';
import {join} from 'path';
import {tmpdir} from 'os';
import {logError} from './utils/message-queue.js';
import type {LangChainProviderConfig} from './types/index.js';

const sleep = promisify(setTimeout);

export class LiteLLMProxy {
	private process: ChildProcess | null = null;
	private port: number;
	private isRunning = false;
	private startupPromise: Promise<void> | null = null;
	private configFile: string | null = null;

	constructor(port = 14242) {
		this.port = port;
	}

	async start(providerConfig?: LangChainProviderConfig, currentModel?: string): Promise<void> {
		if (this.isRunning || this.startupPromise) {
			return this.startupPromise || Promise.resolve();
		}

		this.startupPromise = this.doStart(providerConfig, currentModel);
		return this.startupPromise;
	}

	private async doStart(providerConfig?: LangChainProviderConfig, currentModel?: string): Promise<void> {
		try {
			// Check if port is already in use
			if (await this.isPortInUse()) {
				logError(`Port ${this.port} already in use, assuming LiteLLM proxy is running`);
				this.isRunning = true;
				return;
			}

			// Create LiteLLM config file if provider config is provided
			const args = ['--port', this.port.toString()];
			if (providerConfig) {
				this.configFile = this.createLiteLLMConfig(providerConfig, currentModel);
				args.push('--config', this.configFile);
			}

			// Spawn LiteLLM proxy process
			this.process = spawn('litellm', args, {
				stdio: ['ignore', 'pipe', 'pipe'],
				detached: false,
			});

			// Handle process events
			this.process.on('error', (error) => {
				logError(`LiteLLM proxy process error: ${error.message}`);
				this.isRunning = false;
			});

			this.process.on('exit', (code) => {
				logError(`LiteLLM proxy exited with code: ${code}`);
				this.isRunning = false;
				this.process = null;
			});

			// Wait for the proxy to start up
			await this.waitForStartup();
			this.isRunning = true;
		} catch (error) {
			this.isRunning = false;
			this.process = null;
			throw new Error(`Failed to start LiteLLM proxy: ${error}`);
		} finally {
			this.startupPromise = null;
		}
	}

	private async waitForStartup(maxAttempts = 30): Promise<void> {
		for (let i = 0; i < maxAttempts; i++) {
			try {
				const response = await fetch(`http://localhost:${this.port}/health`, {
					signal: AbortSignal.timeout(1000),
				});
				if (response.ok) {
					return;
				}
			} catch {
				// Proxy not ready yet, continue waiting
			}
			await sleep(1000);
		}
		throw new Error('LiteLLM proxy failed to start within timeout');
	}

	private async isPortInUse(): Promise<boolean> {
		try {
			const response = await fetch(`http://localhost:${this.port}/health`, {
				signal: AbortSignal.timeout(2000),
			});
			return response.ok;
		} catch {
			return false;
		}
	}

	async stop(): Promise<void> {
		if (this.process && this.isRunning) {
			this.process.kill('SIGTERM');
			
			// Wait for graceful shutdown
			await new Promise<void>((resolve) => {
				if (!this.process) {
					resolve();
					return;
				}

				const timeout = setTimeout(() => {
					if (this.process) {
						this.process.kill('SIGKILL');
					}
					resolve();
				}, 5000);

				this.process.on('exit', () => {
					clearTimeout(timeout);
					resolve();
				});
			});
		}
		
		this.isRunning = false;
		this.process = null;
		
		// Clean up config file
		if (this.configFile) {
			try {
				unlinkSync(this.configFile);
			} catch {
				// Ignore errors when cleaning up temp file
			}
			this.configFile = null;
		}
	}

	private createLiteLLMConfig(providerConfig: LangChainProviderConfig, currentModel?: string): string {
		const modelToUse = currentModel || providerConfig.models[0] || 'gpt-3.5-turbo';
		
		const configPath = join(tmpdir(), `litellm-config-${Date.now()}.yaml`);
		const yamlContent = `
model_list:
  - model_name: proxy-model
    litellm_params:
      model: ${modelToUse}
      api_base: ${providerConfig.config.baseURL || ''}
      api_key: ${providerConfig.config.apiKey || 'dummy-key'}

general_settings:
  enable_function_calling: true
`.trim();

		writeFileSync(configPath, yamlContent);
		return configPath;
	}

	getProxyUrl(): string {
		return `http://localhost:${this.port}`;
	}

	isProxyRunning(): boolean {
		return this.isRunning;
	}
}

// Global singleton instance
let globalProxy: LiteLLMProxy | null = null;

export async function getOrCreateProxy(providerConfig?: LangChainProviderConfig, currentModel?: string): Promise<LiteLLMProxy> {
	if (!globalProxy) {
		globalProxy = new LiteLLMProxy();
	}
	
	if (!globalProxy.isProxyRunning()) {
		await globalProxy.start(providerConfig, currentModel);
	}
	
	return globalProxy;
}

export async function stopGlobalProxy(): Promise<void> {
	if (globalProxy) {
		await globalProxy.stop();
		globalProxy = null;
	}
}

// Cleanup on process exit
process.on('SIGINT', async () => {
	await stopGlobalProxy();
	process.exit(0);
});

process.on('SIGTERM', async () => {
	await stopGlobalProxy();
	process.exit(0);
});