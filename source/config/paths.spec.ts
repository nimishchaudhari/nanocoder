import test from 'ava';
import * as path from 'path';
import {getAppDataPath, getConfigPath} from './paths';

// These tests intentionally lock in the public contract for Nanocoder's
// configuration and data directories. Do not change expected values
// without providing a migration strategy.

const ORIGINAL_PLATFORM = process.platform;
const ORIGINAL_ENV = {...process.env};

function setPlatform(platform: NodeJS.Platform) {
	Object.defineProperty(process, 'platform', {
		value: platform,
		configurable: true,
	});
}

function resetEnvironment() {
	for (const key of Object.keys(process.env)) {
		if (!(key in ORIGINAL_ENV)) delete process.env[key];
	}
	for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
		process.env[key] = value as string;
	}
	Object.defineProperty(process, 'platform', {
		value: ORIGINAL_PLATFORM,
		configurable: true,
	});
}

test.afterEach(() => {
	resetEnvironment();
});

// getAppDataPath

test.serial('getAppDataPath uses NANOCODER_DATA_DIR override verbatim', t => {
	process.env.NANOCODER_DATA_DIR = '/custom/data';
	process.env.APPDATA = 'C:/Ignored';
	process.env.XDG_DATA_HOME = '/ignored';
	setPlatform('linux');

	t.is(
		getAppDataPath(),
		'/custom/data',
		'Must respect NANOCODER_DATA_DIR with highest precedence',
	);
});

test.serial('getAppDataPath darwin default path is stable', t => {
	delete process.env.NANOCODER_DATA_DIR;
	setPlatform('darwin');
	process.env.HOME = '/Users/test';

	const result = getAppDataPath();
	t.is(
		result,
		path.join('/Users/test', 'Library', 'Application Support', 'nanocoder'),
		'Stable macOS data path contract',
	);
});

test.serial('getAppDataPath win32 uses APPDATA when set', t => {
	delete process.env.NANOCODER_DATA_DIR;
	setPlatform('win32');
	process.env.APPDATA = 'C:/Users/test/AppData/Roaming';

	const result = getAppDataPath();
	t.is(
		result,
		path.join('C:/Users/test/AppData/Roaming', 'nanocoder'),
		'Stable Windows data path contract with APPDATA',
	);
});

test.serial(
	'getAppDataPath win32 falls back to homedir Roaming when APPDATA missing',
	t => {
		delete process.env.NANOCODER_DATA_DIR;
		setPlatform('win32');
		delete process.env.APPDATA;
		process.env.HOME = 'C:/Users/test';

		const result = getAppDataPath();
		t.is(
			result,
			path.join('C:/Users/test', 'AppData', 'Roaming', 'nanocoder'),
			'Stable Windows data path contract fallback',
		);
	},
);

test.serial(
	'getAppDataPath linux honours XDG_DATA_HOME and ignores APPDATA',
	t => {
		delete process.env.NANOCODER_DATA_DIR;
		setPlatform('linux');
		process.env.XDG_DATA_HOME = '/xdg-data';
		process.env.APPDATA = '/should-not-be-used';

		const result = getAppDataPath();
		t.is(result, path.join('/xdg-data', 'nanocoder'));
	},
);

test.serial('getAppDataPath linux falls back to ~/.local/share', t => {
	delete process.env.NANOCODER_DATA_DIR;
	setPlatform('linux');
	delete process.env.XDG_DATA_HOME;
	process.env.HOME = '/home/test';

	const result = getAppDataPath();
	t.is(
		result,
		path.join('/home/test', '.local', 'share', 'nanocoder'),
		'Stable Linux data path contract fallback',
	);
});

// getConfigPath

test.serial('getConfigPath uses NANOCODER_CONFIG_DIR override verbatim', t => {
	process.env.NANOCODER_CONFIG_DIR = '/custom/config';
	process.env.XDG_CONFIG_HOME = '/ignored';
	process.env.APPDATA = 'C:/Ignored';
	setPlatform('linux');

	t.is(
		getConfigPath(),
		'/custom/config',
		'Must respect NANOCODER_CONFIG_DIR with highest precedence',
	);
});

test.serial('getConfigPath darwin default path is stable', t => {
	delete process.env.NANOCODER_CONFIG_DIR;
	setPlatform('darwin');
	process.env.HOME = '/Users/test';

	const result = getConfigPath();
	t.is(
		result,
		path.join('/Users/test', 'Library', 'Preferences', 'nanocoder'),
		'Stable macOS config path contract',
	);
});

test.serial('getConfigPath win32 uses APPDATA when set', t => {
	delete process.env.NANOCODER_CONFIG_DIR;
	setPlatform('win32');
	process.env.APPDATA = 'C:/Users/test/AppData/Roaming';

	const result = getConfigPath();
	t.is(
		result,
		path.join('C:/Users/test/AppData/Roaming', 'nanocoder'),
		'Stable Windows config path contract with APPDATA',
	);
});

test.serial(
	'getConfigPath win32 falls back to homedir Roaming when APPDATA missing',
	t => {
		delete process.env.NANOCODER_CONFIG_DIR;
		setPlatform('win32');
		delete process.env.APPDATA;
		process.env.HOME = 'C:/Users/test';

		const result = getConfigPath();
		t.is(
			result,
			path.join('C:/Users/test', 'AppData', 'Roaming', 'nanocoder'),
			'Stable Windows config path contract fallback',
		);
	},
);

test.serial(
	'getConfigPath linux honours XDG_CONFIG_HOME and ignores APPDATA',
	t => {
		delete process.env.NANOCODER_CONFIG_DIR;
		setPlatform('linux');
		process.env.XDG_CONFIG_HOME = '/xdg-config';
		process.env.APPDATA = '/should-not-be-used';

		const result = getConfigPath();
		t.is(result, path.join('/xdg-config', 'nanocoder'));
	},
);

test.serial('getConfigPath linux falls back to ~/.config', t => {
	delete process.env.NANOCODER_CONFIG_DIR;
	setPlatform('linux');
	delete process.env.XDG_CONFIG_HOME;
	process.env.HOME = '/home/test';

	const result = getConfigPath();
	t.is(
		result,
		path.join('/home/test', '.config', 'nanocoder'),
		'Stable Linux config path contract fallback',
	);
});
