import test from 'ava';
import {detectInstallationMethod} from './installation-detector';

test.beforeEach(() => {
	// Clean up environment variables before each test
	delete process.env.NANOCODER_INSTALL_METHOD;
	delete process.env.npm_config_prefix;
	delete process.env.npm_config_global;
	delete process.env.PNPM_HOME;
	delete process.env.npm_execpath;
	delete process.env.HOMEBREW_PREFIX;
	delete process.env.HOMEBREW_CELLAR;
});

// Environment override tests
test('detectInstallationMethod: respects env override for npm', t => {
	process.env.NANOCODER_INSTALL_METHOD = 'npm';
	t.is(detectInstallationMethod(), 'npm');
});

test('detectInstallationMethod: respects env override for homebrew', t => {
	process.env.NANOCODER_INSTALL_METHOD = 'homebrew';
	t.is(detectInstallationMethod(), 'homebrew');
});

test('detectInstallationMethod: respects env override for nix', t => {
	process.env.NANOCODER_INSTALL_METHOD = 'nix';
	t.is(detectInstallationMethod(), 'nix');
});

test('detectInstallationMethod: respects env override for unknown', t => {
	process.env.NANOCODER_INSTALL_METHOD = 'unknown';
	t.is(detectInstallationMethod(), 'unknown');
});

// Homebrew environment variable detection
test('detectInstallationMethod: detects homebrew via HOMEBREW_PREFIX', t => {
	process.env.HOMEBREW_PREFIX = '/opt/homebrew';
	t.is(detectInstallationMethod(), 'homebrew');
});

test('detectInstallationMethod: detects homebrew via HOMEBREW_CELLAR', t => {
	process.env.HOMEBREW_CELLAR = '/opt/homebrew/Cellar';
	t.is(detectInstallationMethod(), 'homebrew');
});

// NPM environment variable detection
test('detectInstallationMethod: detects npm via npm_config_prefix', t => {
	process.env.npm_config_prefix = '/usr/local';
	t.is(detectInstallationMethod(), 'npm');
});

test('detectInstallationMethod: detects npm via npm_config_global', t => {
	process.env.npm_config_global = 'true';
	t.is(detectInstallationMethod(), 'npm');
});

test('detectInstallationMethod: detects npm via PNPM_HOME', t => {
	process.env.PNPM_HOME = '/home/user/.local/share/pnpm';
	t.is(detectInstallationMethod(), 'npm');
});

test('detectInstallationMethod: detects npm via npm_execpath', t => {
	process.env.npm_execpath = '/usr/local/lib/node_modules/npm/bin/npm-cli.js';
	t.is(detectInstallationMethod(), 'npm');
});
