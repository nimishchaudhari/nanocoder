import test from 'ava';
import {
	getServerForLanguage,
	getLanguageId,
	getMissingServerHints,
	findLocalServer,
	getKnownServersStatus,
} from './server-discovery';
import type {LSPServerConfig} from './lsp-client';

console.log(`\nserver-discovery.spec.ts`);

// getLanguageId tests
test('getLanguageId - returns typescript for ts extension', t => {
	t.is(getLanguageId('ts'), 'typescript');
});

test('getLanguageId - returns typescriptreact for tsx extension', t => {
	t.is(getLanguageId('tsx'), 'typescriptreact');
});

test('getLanguageId - returns javascript for js extension', t => {
	t.is(getLanguageId('js'), 'javascript');
});

test('getLanguageId - returns javascriptreact for jsx extension', t => {
	t.is(getLanguageId('jsx'), 'javascriptreact');
});

test('getLanguageId - returns javascript for mjs extension', t => {
	t.is(getLanguageId('mjs'), 'javascript');
});

test('getLanguageId - returns javascript for cjs extension', t => {
	t.is(getLanguageId('cjs'), 'javascript');
});

test('getLanguageId - returns python for py extension', t => {
	t.is(getLanguageId('py'), 'python');
});

test('getLanguageId - returns python for pyi extension', t => {
	t.is(getLanguageId('pyi'), 'python');
});

test('getLanguageId - returns rust for rs extension', t => {
	t.is(getLanguageId('rs'), 'rust');
});

test('getLanguageId - returns go for go extension', t => {
	t.is(getLanguageId('go'), 'go');
});

test('getLanguageId - returns c for c extension', t => {
	t.is(getLanguageId('c'), 'c');
});

test('getLanguageId - returns cpp for cpp extension', t => {
	t.is(getLanguageId('cpp'), 'cpp');
});

test('getLanguageId - returns cpp for cc extension', t => {
	t.is(getLanguageId('cc'), 'cpp');
});

test('getLanguageId - returns cpp for cxx extension', t => {
	t.is(getLanguageId('cxx'), 'cpp');
});

test('getLanguageId - returns c for h extension', t => {
	t.is(getLanguageId('h'), 'c');
});

test('getLanguageId - returns cpp for hpp extension', t => {
	t.is(getLanguageId('hpp'), 'cpp');
});

test('getLanguageId - returns cpp for hxx extension', t => {
	t.is(getLanguageId('hxx'), 'cpp');
});

test('getLanguageId - returns json for json extension', t => {
	t.is(getLanguageId('json'), 'json');
});

test('getLanguageId - returns jsonc for jsonc extension', t => {
	t.is(getLanguageId('jsonc'), 'jsonc');
});

test('getLanguageId - returns html for html extension', t => {
	t.is(getLanguageId('html'), 'html');
});

test('getLanguageId - returns html for htm extension', t => {
	t.is(getLanguageId('htm'), 'html');
});

test('getLanguageId - returns css for css extension', t => {
	t.is(getLanguageId('css'), 'css');
});

test('getLanguageId - returns scss for scss extension', t => {
	t.is(getLanguageId('scss'), 'scss');
});

test('getLanguageId - returns less for less extension', t => {
	t.is(getLanguageId('less'), 'less');
});

test('getLanguageId - returns yaml for yaml extension', t => {
	t.is(getLanguageId('yaml'), 'yaml');
});

test('getLanguageId - returns yaml for yml extension', t => {
	t.is(getLanguageId('yml'), 'yaml');
});

test('getLanguageId - returns shellscript for sh extension', t => {
	t.is(getLanguageId('sh'), 'shellscript');
});

test('getLanguageId - returns shellscript for bash extension', t => {
	t.is(getLanguageId('bash'), 'shellscript');
});

test('getLanguageId - returns shellscript for zsh extension', t => {
	t.is(getLanguageId('zsh'), 'shellscript');
});

test('getLanguageId - returns lua for lua extension', t => {
	t.is(getLanguageId('lua'), 'lua');
});

test('getLanguageId - returns markdown for md extension', t => {
	t.is(getLanguageId('md'), 'markdown');
});

test('getLanguageId - returns toml for toml extension', t => {
	t.is(getLanguageId('toml'), 'toml');
});

test('getLanguageId - returns xml for xml extension', t => {
	t.is(getLanguageId('xml'), 'xml');
});

test('getLanguageId - returns sql for sql extension', t => {
	t.is(getLanguageId('sql'), 'sql');
});

test('getLanguageId - returns java for java extension', t => {
	t.is(getLanguageId('java'), 'java');
});

test('getLanguageId - returns kotlin for kt extension', t => {
	t.is(getLanguageId('kt'), 'kotlin');
});

test('getLanguageId - returns swift for swift extension', t => {
	t.is(getLanguageId('swift'), 'swift');
});

test('getLanguageId - returns ruby for rb extension', t => {
	t.is(getLanguageId('rb'), 'ruby');
});

test('getLanguageId - returns php for php extension', t => {
	t.is(getLanguageId('php'), 'php');
});

test('getLanguageId - handles extension with leading dot', t => {
	t.is(getLanguageId('.ts'), 'typescript');
});

test('getLanguageId - handles extension with leading dot for py', t => {
	t.is(getLanguageId('.py'), 'python');
});

test('getLanguageId - returns extension as fallback for unknown type', t => {
	t.is(getLanguageId('xyz'), 'xyz');
});

test('getLanguageId - returns extension as fallback for unknown with dot', t => {
	t.is(getLanguageId('.unknown'), 'unknown');
});

// getServerForLanguage tests
test('getServerForLanguage - finds server for matching extension', t => {
	const servers: LSPServerConfig[] = [
		{
			name: 'typescript-language-server',
			command: 'typescript-language-server',
			args: ['--stdio'],
			languages: ['ts', 'tsx', 'js', 'jsx'],
		},
		{
			name: 'pyright',
			command: 'pyright-langserver',
			args: ['--stdio'],
			languages: ['py', 'pyi'],
		},
	];

	const result = getServerForLanguage(servers, 'ts');
	t.truthy(result);
	t.is(result?.name, 'typescript-language-server');
});

test('getServerForLanguage - finds python server for py extension', t => {
	const servers: LSPServerConfig[] = [
		{
			name: 'typescript-language-server',
			command: 'typescript-language-server',
			args: ['--stdio'],
			languages: ['ts', 'tsx'],
		},
		{
			name: 'pyright',
			command: 'pyright-langserver',
			args: ['--stdio'],
			languages: ['py', 'pyi'],
		},
	];

	const result = getServerForLanguage(servers, 'py');
	t.truthy(result);
	t.is(result?.name, 'pyright');
});

test('getServerForLanguage - returns undefined for no matching server', t => {
	const servers: LSPServerConfig[] = [
		{
			name: 'typescript-language-server',
			command: 'typescript-language-server',
			args: ['--stdio'],
			languages: ['ts', 'tsx'],
		},
	];

	const result = getServerForLanguage(servers, 'py');
	t.is(result, undefined);
});

test('getServerForLanguage - handles extension with leading dot', t => {
	const servers: LSPServerConfig[] = [
		{
			name: 'rust-analyzer',
			command: 'rust-analyzer',
			args: [],
			languages: ['rs'],
		},
	];

	const result = getServerForLanguage(servers, '.rs');
	t.truthy(result);
	t.is(result?.name, 'rust-analyzer');
});

test('getServerForLanguage - returns first matching server when multiple match', t => {
	const servers: LSPServerConfig[] = [
		{
			name: 'pyright',
			command: 'pyright-langserver',
			args: ['--stdio'],
			languages: ['py', 'pyi'],
		},
		{
			name: 'pylsp',
			command: 'pylsp',
			args: [],
			languages: ['py', 'pyi'],
		},
	];

	const result = getServerForLanguage(servers, 'py');
	t.truthy(result);
	t.is(result?.name, 'pyright');
});

test('getServerForLanguage - handles empty servers array', t => {
	const servers: LSPServerConfig[] = [];
	const result = getServerForLanguage(servers, 'ts');
	t.is(result, undefined);
});

// getMissingServerHints tests
test('getMissingServerHints - returns array', t => {
	const result = getMissingServerHints(['ts']);
	t.true(Array.isArray(result));
});

test('getMissingServerHints - handles extension with leading dot', t => {
	const result = getMissingServerHints(['.ts', '.py']);
	t.true(Array.isArray(result));
});

test('getMissingServerHints - handles empty extensions array', t => {
	const result = getMissingServerHints([]);
	t.deepEqual(result, []);
});

test('getMissingServerHints - returns hints for unknown extensions only if server exists', t => {
	// Unknown extensions won't have hints because there's no known server
	const result = getMissingServerHints(['xyz']);
	t.true(Array.isArray(result));
});

test('getMissingServerHints - does not duplicate hints for same server', t => {
	// ts and tsx are handled by the same server
	const result = getMissingServerHints(['ts', 'tsx', 'js', 'jsx']);
	// Should have at most one hint for typescript-language-server
	const tsHints = result.filter(h => h.includes('typescript-language-server'));
	t.true(tsHints.length <= 1);
});

// findLocalServer tests
test('findLocalServer - returns null for non-existent server', t => {
	const result = findLocalServer('/non-existent-path', 'some-server');
	t.is(result, null);
});

test('findLocalServer - returns null for non-existent project root', t => {
	const result = findLocalServer(
		'/does/not/exist',
		'typescript-language-server',
	);
	t.is(result, null);
});

test('findLocalServer - searches in node_modules/.bin', t => {
	// This test verifies the function behavior - it should check specific paths
	const result = findLocalServer(process.cwd(), 'non-existent-binary-xyz');
	t.is(result, null);
});

// getKnownServersStatus tests
test('getKnownServersStatus - returns array of server status', t => {
	const result = getKnownServersStatus();
	t.true(Array.isArray(result));
	t.true(result.length > 0);
});

test('getKnownServersStatus - each item has required properties', t => {
	const result = getKnownServersStatus();

	for (const server of result) {
		t.truthy(server.name);
		t.true(typeof server.available === 'boolean');
		t.true(Array.isArray(server.languages));
		t.true(server.languages.length > 0);
	}
});

test('getKnownServersStatus - includes typescript server', t => {
	const result = getKnownServersStatus();
	const tsServer = result.find(s => s.name === 'typescript-language-server');
	t.truthy(tsServer);
	t.true(tsServer!.languages.includes('ts'));
	t.true(tsServer!.languages.includes('tsx'));
});

test('getKnownServersStatus - includes pyright server', t => {
	const result = getKnownServersStatus();
	const pyServer = result.find(s => s.name === 'pyright');
	t.truthy(pyServer);
	t.true(pyServer!.languages.includes('py'));
});

test('getKnownServersStatus - includes rust-analyzer', t => {
	const result = getKnownServersStatus();
	const rustServer = result.find(s => s.name === 'rust-analyzer');
	t.truthy(rustServer);
	t.true(rustServer!.languages.includes('rs'));
});

test('getKnownServersStatus - includes gopls', t => {
	const result = getKnownServersStatus();
	const goServer = result.find(s => s.name === 'gopls');
	t.truthy(goServer);
	t.true(goServer!.languages.includes('go'));
});

test('getKnownServersStatus - includes clangd', t => {
	const result = getKnownServersStatus();
	const cppServer = result.find(s => s.name === 'clangd');
	t.truthy(cppServer);
	t.true(cppServer!.languages.includes('c'));
	t.true(cppServer!.languages.includes('cpp'));
});

test('getKnownServersStatus - has install hints', t => {
	const result = getKnownServersStatus();
	// At least some servers should have install hints
	const withHints = result.filter(s => s.installHint);
	t.true(withHints.length > 0);
});

test('getKnownServersStatus - install hint contains useful info', t => {
	const result = getKnownServersStatus();
	const tsServer = result.find(s => s.name === 'typescript-language-server');
	t.truthy(tsServer?.installHint);
	t.true(tsServer!.installHint!.includes('npm'));
});

// discoverLanguageServers is harder to test as it depends on system state
// We can test the structure of what it returns

test('getKnownServersStatus - includes all major language servers', t => {
	const result = getKnownServersStatus();
	const serverNames = result.map(s => s.name);

	// Check for presence of major servers
	t.true(serverNames.includes('typescript-language-server'));
	t.true(serverNames.includes('pyright') || serverNames.includes('pylsp'));
	t.true(serverNames.includes('rust-analyzer'));
	t.true(serverNames.includes('gopls'));
	t.true(serverNames.includes('clangd'));
});

test('getKnownServersStatus - includes web servers', t => {
	const result = getKnownServersStatus();
	const serverNames = result.map(s => s.name);

	t.true(serverNames.includes('vscode-json-languageserver'));
	t.true(serverNames.includes('vscode-html-languageserver'));
	t.true(serverNames.includes('vscode-css-languageserver'));
});

test('getKnownServersStatus - includes yaml server', t => {
	const result = getKnownServersStatus();
	const yamlServer = result.find(s => s.name === 'yaml-language-server');
	t.truthy(yamlServer);
	t.true(yamlServer!.languages.includes('yaml'));
	t.true(yamlServer!.languages.includes('yml'));
});

test('getKnownServersStatus - includes bash server', t => {
	const result = getKnownServersStatus();
	const bashServer = result.find(s => s.name === 'bash-language-server');
	t.truthy(bashServer);
	t.true(bashServer!.languages.includes('sh'));
	t.true(bashServer!.languages.includes('bash'));
});

test('getKnownServersStatus - includes lua server', t => {
	const result = getKnownServersStatus();
	const luaServer = result.find(s => s.name === 'lua-language-server');
	t.truthy(luaServer);
	t.true(luaServer!.languages.includes('lua'));
});

// Edge cases
test('getLanguageId - handles empty string', t => {
	const result = getLanguageId('');
	t.is(result, '');
});

test('getServerForLanguage - handles empty extension', t => {
	const servers: LSPServerConfig[] = [
		{
			name: 'test',
			command: 'test',
			languages: ['ts'],
		},
	];
	const result = getServerForLanguage(servers, '');
	t.is(result, undefined);
});
