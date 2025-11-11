import test from 'ava';
import {detectInstallationMethod} from './installation-detector';

test.beforeEach(() => {
	delete process.env.NANOCODER_INSTALL_METHOD;
});

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
