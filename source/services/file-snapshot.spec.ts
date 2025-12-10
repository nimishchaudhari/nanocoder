import test from 'ava';
import * as fs from 'fs/promises';
import * as path from 'path';
import {existsSync} from 'fs';
import {FileSnapshotService} from './file-snapshot';

// Helper to create a temporary directory for tests
async function createTempDir(): Promise<string> {
	const tempDir = path.join(
		process.cwd(),
		'.test-temp',
		`snapshot-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
	);
	await fs.mkdir(tempDir, {recursive: true});
	return tempDir;
}

// Helper to clean up temp directory
async function cleanupTempDir(dir: string): Promise<void> {
	try {
		await fs.rm(dir, {recursive: true, force: true});
	} catch {
		// Ignore cleanup errors
	}
}

// Helper to create a test file
async function createTestFile(
	dir: string,
	relativePath: string,
	content: string,
): Promise<string> {
	const fullPath = path.join(dir, relativePath);
	await fs.mkdir(path.dirname(fullPath), {recursive: true});
	await fs.writeFile(fullPath, content, 'utf-8');
	return fullPath;
}

test.serial('FileSnapshotService captures single file', async t => {
	const tempDir = await createTempDir();
	try {
		await createTestFile(tempDir, 'test.txt', 'Hello, World!');

		const service = new FileSnapshotService(tempDir);
		const snapshots = await service.captureFiles(['test.txt']);

		t.is(snapshots.size, 1);
		t.is(snapshots.get('test.txt'), 'Hello, World!');
	} finally {
		await cleanupTempDir(tempDir);
	}
});

test.serial('FileSnapshotService captures multiple files', async t => {
	const tempDir = await createTempDir();
	try {
		await createTestFile(tempDir, 'file1.txt', 'Content 1');
		await createTestFile(tempDir, 'file2.txt', 'Content 2');
		await createTestFile(tempDir, 'file3.txt', 'Content 3');

		const service = new FileSnapshotService(tempDir);
		const snapshots = await service.captureFiles([
			'file1.txt',
			'file2.txt',
			'file3.txt',
		]);

		t.is(snapshots.size, 3);
		t.is(snapshots.get('file1.txt'), 'Content 1');
		t.is(snapshots.get('file2.txt'), 'Content 2');
		t.is(snapshots.get('file3.txt'), 'Content 3');
	} finally {
		await cleanupTempDir(tempDir);
	}
});

test.serial('FileSnapshotService captures files in subdirectories', async t => {
	const tempDir = await createTempDir();
	try {
		await createTestFile(tempDir, 'src/index.ts', 'export {};');
		await createTestFile(
			tempDir,
			'src/utils/helper.ts',
			'export function help() {}',
		);

		const service = new FileSnapshotService(tempDir);
		const snapshots = await service.captureFiles([
			'src/index.ts',
			'src/utils/helper.ts',
		]);

		t.is(snapshots.size, 2);
		t.is(snapshots.get('src/index.ts'), 'export {};');
		t.is(snapshots.get('src/utils/helper.ts'), 'export function help() {}');
	} finally {
		await cleanupTempDir(tempDir);
	}
});

test.serial(
	'FileSnapshotService handles non-existent files gracefully',
	async t => {
		const tempDir = await createTempDir();
		try {
			await createTestFile(tempDir, 'exists.txt', 'I exist');

			const service = new FileSnapshotService(tempDir);
			const snapshots = await service.captureFiles([
				'exists.txt',
				'does-not-exist.txt',
			]);

			// Should only capture the existing file
			t.is(snapshots.size, 1);
			t.is(snapshots.get('exists.txt'), 'I exist');
		} finally {
			await cleanupTempDir(tempDir);
		}
	},
);

test.serial('FileSnapshotService restores files', async t => {
	const tempDir = await createTempDir();
	try {
		const service = new FileSnapshotService(tempDir);
		const snapshots = new Map<string, string>();
		snapshots.set('restored.txt', 'Restored content');

		await service.restoreFiles(snapshots);

		const restoredPath = path.join(tempDir, 'restored.txt');
		t.true(existsSync(restoredPath));
		const content = await fs.readFile(restoredPath, 'utf-8');
		t.is(content, 'Restored content');
	} finally {
		await cleanupTempDir(tempDir);
	}
});

test.serial('FileSnapshotService restores files in subdirectories', async t => {
	const tempDir = await createTempDir();
	try {
		const service = new FileSnapshotService(tempDir);
		const snapshots = new Map<string, string>();
		snapshots.set('deep/nested/file.txt', 'Nested content');

		await service.restoreFiles(snapshots);

		const restoredPath = path.join(tempDir, 'deep/nested/file.txt');
		t.true(existsSync(restoredPath));
		const content = await fs.readFile(restoredPath, 'utf-8');
		t.is(content, 'Nested content');
	} finally {
		await cleanupTempDir(tempDir);
	}
});

test.serial('FileSnapshotService restores multiple files', async t => {
	const tempDir = await createTempDir();
	try {
		const service = new FileSnapshotService(tempDir);
		const snapshots = new Map<string, string>();
		snapshots.set('file1.txt', 'Content 1');
		snapshots.set('file2.txt', 'Content 2');
		snapshots.set('subdir/file3.txt', 'Content 3');

		await service.restoreFiles(snapshots);

		t.true(existsSync(path.join(tempDir, 'file1.txt')));
		t.true(existsSync(path.join(tempDir, 'file2.txt')));
		t.true(existsSync(path.join(tempDir, 'subdir/file3.txt')));
	} finally {
		await cleanupTempDir(tempDir);
	}
});

test.serial(
	'FileSnapshotService overwrites existing files on restore',
	async t => {
		const tempDir = await createTempDir();
		try {
			await createTestFile(tempDir, 'existing.txt', 'Old content');

			const service = new FileSnapshotService(tempDir);
			const snapshots = new Map<string, string>();
			snapshots.set('existing.txt', 'New content');

			await service.restoreFiles(snapshots);

			const content = await fs.readFile(
				path.join(tempDir, 'existing.txt'),
				'utf-8',
			);
			t.is(content, 'New content');
		} finally {
			await cleanupTempDir(tempDir);
		}
	},
);

test.serial(
	'FileSnapshotService getSnapshotSize calculates correct size',
	async t => {
		const service = new FileSnapshotService(process.cwd());
		const snapshots = new Map<string, string>();
		snapshots.set('file1.txt', 'Hello'); // 5 bytes
		snapshots.set('file2.txt', 'World!'); // 6 bytes

		const size = service.getSnapshotSize(snapshots);

		t.is(size, 11);
	},
);

test.serial(
	'FileSnapshotService getSnapshotSize handles empty snapshots',
	async t => {
		const service = new FileSnapshotService(process.cwd());
		const snapshots = new Map<string, string>();

		const size = service.getSnapshotSize(snapshots);

		t.is(size, 0);
	},
);

test.serial(
	'FileSnapshotService getSnapshotSize handles unicode content',
	async t => {
		const service = new FileSnapshotService(process.cwd());
		const snapshots = new Map<string, string>();
		snapshots.set('unicode.txt', '日本語'); // 9 bytes in UTF-8

		const size = service.getSnapshotSize(snapshots);

		t.is(size, 9);
	},
);

test.serial(
	'FileSnapshotService validateRestorePath validates writable paths',
	async t => {
		const tempDir = await createTempDir();
		try {
			const service = new FileSnapshotService(tempDir);
			const snapshots = new Map<string, string>();
			snapshots.set('new-file.txt', 'Content');

			const result = await service.validateRestorePath(snapshots);

			t.true(result.valid);
			t.is(result.errors.length, 0);
		} finally {
			await cleanupTempDir(tempDir);
		}
	},
);

test.serial(
	'FileSnapshotService validateRestorePath validates existing writable files',
	async t => {
		const tempDir = await createTempDir();
		try {
			await createTestFile(tempDir, 'writable.txt', 'Original');

			const service = new FileSnapshotService(tempDir);
			const snapshots = new Map<string, string>();
			snapshots.set('writable.txt', 'New content');

			const result = await service.validateRestorePath(snapshots);

			t.true(result.valid);
		} finally {
			await cleanupTempDir(tempDir);
		}
	},
);

test.serial('FileSnapshotService getModifiedFiles returns array', async t => {
	// Note: This test runs in a git directory, so it may return files.
	// The important thing is that it returns an array and doesn't throw.
	const tempDir = await createTempDir();
	try {
		const service = new FileSnapshotService(tempDir);
		const files = service.getModifiedFiles();

		t.true(Array.isArray(files));
		// Files should all be strings
		t.true(files.every(f => typeof f === 'string'));
	} finally {
		await cleanupTempDir(tempDir);
	}
});

test.serial('FileSnapshotService captures empty files', async t => {
	const tempDir = await createTempDir();
	try {
		await createTestFile(tempDir, 'empty.txt', '');

		const service = new FileSnapshotService(tempDir);
		const snapshots = await service.captureFiles(['empty.txt']);

		t.is(snapshots.size, 1);
		t.is(snapshots.get('empty.txt'), '');
	} finally {
		await cleanupTempDir(tempDir);
	}
});

test.serial(
	'FileSnapshotService captures files with special characters in content',
	async t => {
		const tempDir = await createTempDir();
		try {
			const specialContent = 'Special chars: \n\t\r "quotes" & <tags> 日本語';
			await createTestFile(tempDir, 'special.txt', specialContent);

			const service = new FileSnapshotService(tempDir);
			const snapshots = await service.captureFiles(['special.txt']);

			t.is(snapshots.get('special.txt'), specialContent);
		} finally {
			await cleanupTempDir(tempDir);
		}
	},
);

test.serial('FileSnapshotService uses relative paths in snapshots', async t => {
	const tempDir = await createTempDir();
	try {
		await createTestFile(tempDir, 'src/file.ts', 'content');

		const service = new FileSnapshotService(tempDir);
		const snapshots = await service.captureFiles(['src/file.ts']);

		// Should use relative path, not absolute
		const keys = Array.from(snapshots.keys());
		t.is(keys.length, 1);
		t.is(keys[0], 'src/file.ts');
		t.false(keys[0].startsWith('/'));
	} finally {
		await cleanupTempDir(tempDir);
	}
});

test.serial('FileSnapshotService handles large files', async t => {
	const tempDir = await createTempDir();
	try {
		const largeContent = 'x'.repeat(100000); // 100KB
		await createTestFile(tempDir, 'large.txt', largeContent);

		const service = new FileSnapshotService(tempDir);
		const snapshots = await service.captureFiles(['large.txt']);

		t.is(snapshots.get('large.txt')?.length, 100000);
	} finally {
		await cleanupTempDir(tempDir);
	}
});

test.serial('FileSnapshotService defaults to current working directory', t => {
	const service = new FileSnapshotService();
	// Just verify it doesn't throw
	t.truthy(service);
});
