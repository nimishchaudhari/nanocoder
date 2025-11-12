import test from 'ava';
import {readFileSync} from 'fs';
import {join, dirname} from 'path';
import {fileURLToPath} from 'url';
import {checkForUpdates} from './update-checker';

console.log(`\nupdate-checker.spec.ts`);

// Get current version from package.json dynamically
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, '../../package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const CURRENT_VERSION = packageJson.version as string;

// Mock fetch globally for testing
const originalFetch = globalThis.fetch;

// Helper to create mock fetch responses
function createMockFetch(
	status: number,
	data: unknown,
	shouldReject = false,
): typeof fetch {
	return (async () => {
		if (shouldReject) {
			throw new Error('Network error');
		}

		return {
			ok: status >= 200 && status < 300,
			status,
			statusText: status === 200 ? 'OK' : 'Error',
			json: async () => data,
		} as Response;
	}) as typeof fetch;
}

test.beforeEach(() => {
	// Reset fetch before each test
	globalThis.fetch = originalFetch;
	// Default to npm install override
	process.env.NANOCODER_INSTALL_METHOD = 'npm';
});

test.afterEach(() => {
	// Restore original fetch and env after each test
	globalThis.fetch = originalFetch;
	delete process.env.NANOCODER_INSTALL_METHOD;
});

// Version Comparison Tests

test('checkForUpdates: detects newer major version', async t => {
	globalThis.fetch = createMockFetch(200, {
		version: '2.0.0',
		name: '@nanocollective/nanocoder',
	});

	const result = await checkForUpdates();

	t.true(result.hasUpdate);
	t.is(result.currentVersion, CURRENT_VERSION);
	t.is(result.latestVersion, '2.0.0');
	t.truthy(result.updateCommand);
});

test('checkForUpdates: detects newer minor version', async t => {
	globalThis.fetch = createMockFetch(200, {
		version: '1.17.0',
		name: '@nanocollective/nanocoder',
	});

	const result = await checkForUpdates();

	t.true(result.hasUpdate);
	t.is(result.latestVersion, '1.17.0');
});

test('checkForUpdates: detects newer patch version', async t => {
	globalThis.fetch = createMockFetch(200, {
		version: '1.16.4',
		name: '@nanocollective/nanocoder',
	});

	const result = await checkForUpdates();

	t.true(result.hasUpdate);
	t.is(result.latestVersion, '1.16.4');
});

test('checkForUpdates: detects same version (no update)', async t => {
	globalThis.fetch = createMockFetch(200, {
		version: CURRENT_VERSION,
		name: '@nanocollective/nanocoder',
	});

	const result = await checkForUpdates();

	t.false(result.hasUpdate);
	t.is(result.currentVersion, CURRENT_VERSION);
	t.is(result.latestVersion, CURRENT_VERSION);
	t.is(result.updateCommand, undefined);
});

test('checkForUpdates: detects older version (no update)', async t => {
	globalThis.fetch = createMockFetch(200, {
		version: '1.16.2',
		name: '@nanocollective/nanocoder',
	});

	const result = await checkForUpdates();

	t.false(result.hasUpdate);
	t.is(result.latestVersion, '1.16.2');
});

test('checkForUpdates: handles version with v prefix', async t => {
	globalThis.fetch = createMockFetch(200, {
		version: 'v2.0.0',
		name: '@nanocollective/nanocoder',
	});

	const result = await checkForUpdates();

	t.true(result.hasUpdate);
	t.is(result.latestVersion, 'v2.0.0');
});

test('checkForUpdates: handles pre-release versions', async t => {
	globalThis.fetch = createMockFetch(200, {
		version: '2.0.0-beta.1',
		name: '@nanocollective/nanocoder',
	});

	const result = await checkForUpdates();

	// Pre-release info is stripped, so 2.0.0 > 1.16.3
	t.true(result.hasUpdate);
	t.is(result.latestVersion, '2.0.0-beta.1');
});

// Network Error Handling Tests

test('checkForUpdates: handles network errors gracefully', async t => {
	globalThis.fetch = createMockFetch(200, {}, true);

	const result = await checkForUpdates();

	t.false(result.hasUpdate);
	t.truthy(result.currentVersion);
	t.is(result.latestVersion, undefined);
});

test('checkForUpdates: handles HTTP 404 error', async t => {
	globalThis.fetch = createMockFetch(404, {
		error: 'Not found',
	});

	const result = await checkForUpdates();

	t.false(result.hasUpdate);
	t.truthy(result.currentVersion);
});

test('checkForUpdates: handles HTTP 500 error', async t => {
	globalThis.fetch = createMockFetch(500, {
		error: 'Internal server error',
	});

	const result = await checkForUpdates();

	t.false(result.hasUpdate);
	t.truthy(result.currentVersion);
});

test('checkForUpdates: handles timeout (via AbortSignal)', async t => {
	// Simulate timeout by throwing AbortError
	globalThis.fetch = (async () => {
		const error = new Error('The operation was aborted');
		error.name = 'AbortError';
		throw error;
	}) as typeof fetch;

	const result = await checkForUpdates();

	// Should handle timeout gracefully
	t.false(result.hasUpdate);
});

// Response Format Tests

test('checkForUpdates: returns correct update command', async t => {
	globalThis.fetch = createMockFetch(200, {
		version: '2.0.0',
		name: '@nanocollective/nanocoder',
	});

	const result = await checkForUpdates();

	t.is(result.updateCommand, 'npm update -g @nanocollective/nanocoder');
});

test('checkForUpdates: returns correct Homebrew command when installed via Homebrew', async t => {
	globalThis.fetch = createMockFetch(200, {
		version: '2.0.0',
		name: '@nanocollective/nanocoder',
	});

	process.env.NANOCODER_INSTALL_METHOD = 'homebrew';

	const result = await checkForUpdates();

	t.is(
		result.updateCommand,
		'brew list nanocoder >/dev/null 2>&1 && brew upgrade nanocoder || (echo "Error: nanocoder not found in Homebrew. Please install it first with: brew install nanocoder" && exit 1)',
	);
});

test('checkForUpdates: returns message for Nix installations (no executable command)', async t => {
	globalThis.fetch = createMockFetch(200, {
		version: '2.0.0',
		name: '@nanocollective/nanocoder',
	});

	process.env.NANOCODER_INSTALL_METHOD = 'nix';

	const result = await checkForUpdates();

	t.is(
		result.updateMessage,
		'To update, re-run: nix run github:Nano-Collective/nanocoder (or update your flake).',
	);
});

test('checkForUpdates: includes current version in response', async t => {
	globalThis.fetch = createMockFetch(200, {
		version: '2.0.0',
		name: '@nanocollective/nanocoder',
	});

	const result = await checkForUpdates();

	t.truthy(result.currentVersion);
	t.regex(result.currentVersion, /^\d+\.\d+\.\d+/);
});

test('checkForUpdates: handles missing version field in response', async t => {
	globalThis.fetch = createMockFetch(200, {
		name: '@nanocollective/nanocoder',
		// version field missing
	});

	const result = await checkForUpdates();

	t.false(result.hasUpdate);
});

test('checkForUpdates: handles malformed JSON response', async t => {
	globalThis.fetch = (async () => {
		return {
			ok: true,
			status: 200,
			statusText: 'OK',
			json: async () => {
				throw new Error('Invalid JSON');
			},
		} as unknown as Response;
	}) as typeof fetch;

	const result = await checkForUpdates();

	t.false(result.hasUpdate);
});

// Edge Cases

test('checkForUpdates: handles empty version string', async t => {
	globalThis.fetch = createMockFetch(200, {
		version: '',
		name: '@nanocollective/nanocoder',
	});

	const result = await checkForUpdates();

	t.false(result.hasUpdate);
});

test('checkForUpdates: handles version with extra segments', async t => {
	globalThis.fetch = createMockFetch(200, {
		version: '2.0.0.1',
		name: '@nanocollective/nanocoder',
	});

	const result = await checkForUpdates();

	// Should compare first 3 segments
	t.true(result.hasUpdate);
});

test('checkForUpdates: handles invalid version format', async t => {
	globalThis.fetch = createMockFetch(200, {
		version: 'not-a-version',
		name: '@nanocollective/nanocoder',
	});

	const result = await checkForUpdates();

	// Should handle gracefully
	t.false(result.hasUpdate);
});

// Integration Tests

test('checkForUpdates: complete workflow for update available', async t => {
	globalThis.fetch = createMockFetch(200, {
		version: '99.99.99',
		name: '@nanocollective/nanocoder',
	});

	const result = await checkForUpdates();

	t.true(result.hasUpdate);
	t.truthy(result.currentVersion);
	t.is(result.latestVersion, '99.99.99');
	t.is(result.updateCommand, 'npm update -g @nanocollective/nanocoder');
});

test('checkForUpdates: complete workflow for no update', async t => {
	globalThis.fetch = createMockFetch(200, {
		version: '0.0.1',
		name: '@nanocollective/nanocoder',
	});

	const result = await checkForUpdates();

	t.false(result.hasUpdate);
	t.truthy(result.currentVersion);
	t.is(result.latestVersion, '0.0.1');
	t.is(result.updateCommand, undefined);
});

test('checkForUpdates: complete workflow for network failure', async t => {
	globalThis.fetch = createMockFetch(200, {}, true);

	const result = await checkForUpdates();

	t.false(result.hasUpdate);
	t.truthy(result.currentVersion);
	t.is(result.latestVersion, undefined);
	t.is(result.updateCommand, undefined);
});
