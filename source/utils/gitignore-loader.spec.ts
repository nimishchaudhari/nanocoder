import {mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import test from 'ava';
import {DEFAULT_IGNORE_DIRS, loadGitignore} from './gitignore-loader';

test('loadGitignore returns ignore instance', t => {
	const ig = loadGitignore(process.cwd());
	t.truthy(ig);
	t.is(typeof ig.ignores, 'function');
});

test('loadGitignore ignores default directories', t => {
	const ig = loadGitignore(process.cwd());
	for (const dir of DEFAULT_IGNORE_DIRS) {
		t.true(ig.ignores(dir), `Should ignore ${dir}`);
		t.true(ig.ignores(`${dir}/file.ts`), `Should ignore ${dir}/file.ts`);
	}
});

test('DEFAULT_IGNORE_DIRS contains expected directories', t => {
	t.true(DEFAULT_IGNORE_DIRS.includes('node_modules'));
	t.true(DEFAULT_IGNORE_DIRS.includes('.git'));
	t.true(DEFAULT_IGNORE_DIRS.includes('dist'));
	t.true(DEFAULT_IGNORE_DIRS.includes('build'));
	t.true(DEFAULT_IGNORE_DIRS.includes('coverage'));
});

test.serial('loadGitignore loads .gitignore patterns', async t => {
	const testDir = join(process.cwd(), 'test-gitignore-loader-temp');

	try {
		mkdirSync(testDir, {recursive: true});
		writeFileSync(join(testDir, '.gitignore'), '*.log\ntmp/\n');

		const ig = loadGitignore(testDir);

		t.true(ig.ignores('file.log'), 'Should ignore .log files');
		t.true(ig.ignores('tmp/file.txt'), 'Should ignore tmp/ directory');
		t.false(ig.ignores('file.ts'), 'Should not ignore .ts files');
	} finally {
		rmSync(testDir, {recursive: true, force: true});
	}
});

test.serial('loadGitignore works without .gitignore file', async t => {
	const testDir = join(process.cwd(), 'test-gitignore-no-file-temp');

	try {
		mkdirSync(testDir, {recursive: true});
		// No .gitignore file

		const ig = loadGitignore(testDir);

		// Should still have default ignores
		t.true(ig.ignores('node_modules/file.js'));
		t.false(ig.ignores('src/file.ts'));
	} finally {
		rmSync(testDir, {recursive: true, force: true});
	}
});
