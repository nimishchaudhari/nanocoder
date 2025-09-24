import {exec} from 'node:child_process';
import {promisify} from 'node:util';
import * as si from 'systeminformation';
import {SystemCapabilities} from '../types/index.js';

const execAsync = promisify(exec);

export class SystemDetector {
	private static instance: SystemDetector;
	private cachedCapabilities: SystemCapabilities | null = null;
	private lastDetection: number = 0;
	private readonly CACHE_DURATION = 30_000; // 30 seconds

	static getInstance(): SystemDetector {
		if (!SystemDetector.instance) {
			SystemDetector.instance = new SystemDetector();
		}
		return SystemDetector.instance;
	}

	async getSystemCapabilities(): Promise<SystemCapabilities> {
		const now = Date.now();
		if (this.cachedCapabilities && (now - this.lastDetection) < this.CACHE_DURATION) {
			return this.cachedCapabilities;
		}

		const capabilities = await this.detectSystemCapabilities();
		this.cachedCapabilities = capabilities;
		this.lastDetection = now;
		return capabilities;
	}

	private async detectSystemCapabilities(): Promise<SystemCapabilities> {
		const [cpu, memory, gpu, platform, network, ollama] = await Promise.all([
			this.detectCpu(),
			this.detectMemory(),
			this.detectGpu(),
			this.detectPlatform(),
			this.detectNetwork(),
			this.detectOllama(),
		]);

		return {
			cpu,
			memory,
			gpu,
			platform,
			network,
			ollama,
		};
	}

	private async detectCpu() {
		const cpuInfo = await si.cpu();
		return {
			cores: cpuInfo.cores,
			architecture: cpuInfo.family,
		};
	}

	private async detectMemory() {
		const memInfo = await si.mem();
		return {
			total: Math.round(memInfo.total / (1024 ** 3)), // Convert to GB
			available: Math.round(memInfo.available / (1024 ** 3)), // Convert to GB
		};
	}

	private async detectPlatform(): Promise<NodeJS.Platform> {
		const osInfo = await si.osInfo();
		return osInfo.platform as NodeJS.Platform;
	}

	private async detectGpu(): Promise<SystemCapabilities['gpu']> {
		try {
			const graphics = await si.graphics();

			if (graphics.controllers && graphics.controllers.length > 0) {
				const controller = graphics.controllers[0];
				const vendor = controller.vendor?.toLowerCase() || '';
				const model = controller.model?.toLowerCase() || '';

				let type: SystemCapabilities['gpu']['type'] = 'none';
				if (vendor.includes('nvidia') || model.includes('nvidia')) {
					type = 'nvidia';
				} else if (vendor.includes('amd') || model.includes('amd') || model.includes('radeon')) {
					type = 'amd';
				} else if (vendor.includes('apple') || model.includes('apple')) {
					type = 'apple';
				} else if (vendor.includes('intel') || model.includes('intel')) {
					type = 'intel';
				}

				const memoryMB = typeof controller.vram === 'number' ? controller.vram :
								 typeof controller.vramDynamic === 'number' ? controller.vramDynamic : 0;
				const memoryGB = memoryMB > 0 ? Math.round(memoryMB / 1024) : undefined;

				return {
					available: true,
					type,
					memory: memoryGB,
				};
			}
		} catch {
			// Fallback to basic detection if systeminformation fails
		}

		return {
			available: false,
			type: 'none',
		};
	}


	private async detectNetwork(): Promise<SystemCapabilities['network']> {
		try {
			// Simple connectivity test
			const testUrls = ['google.com', 'cloudflare.com'];
			const results = await Promise.allSettled(
				testUrls.map(async url => {
					const start = Date.now();
					await execAsync(`ping -c 1 -W 2000 ${url}`, {timeout: 3000});
					return Date.now() - start;
				})
			);

			const successful = results.filter(r => r.status === 'fulfilled') as PromiseFulfilledResult<number>[];

			if (successful.length === 0) {
				return {connected: false};
			}

			const avgLatency = successful.reduce((sum, r) => sum + r.value, 0) / successful.length;

			let speed: 'slow' | 'medium' | 'fast';
			if (avgLatency < 50) speed = 'fast';
			else if (avgLatency < 200) speed = 'medium';
			else speed = 'slow';

			return {
				connected: true,
				speed,
			};
		} catch {
			return {connected: false};
		}
	}

	private async detectOllama(): Promise<SystemCapabilities['ollama']> {
		try {
			// Check if ollama is installed
			await execAsync('which ollama').catch(() => {
				throw new Error('Ollama not found');
			});

			// Check if ollama is running
			let running = false;
			let models: string[] = [];

			try {
				const listResult = await execAsync('ollama list', {timeout: 5000});
				running = true;

				// Parse model list
				const lines = listResult.stdout.trim().split('\n').slice(1); // Skip header
				models = lines
					.map(line => line.split(/\s+/)[0]) // Get first column (model name)
					.filter(name => name && name !== '');
			} catch {
				// Ollama installed but not running or no models
			}

			return {
				installed: true,
				running,
				models,
			};
		} catch {
			return {
				installed: false,
				running: false,
				models: [],
			};
		}
	}

	clearCache(): void {
		this.cachedCapabilities = null;
		this.lastDetection = 0;
	}
}

export const systemDetector = SystemDetector.getInstance();