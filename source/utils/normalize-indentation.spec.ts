import test from 'ava';

import {
	normalizeIndentation,
	normalizeIndentationString,
} from './normalize-indentation';

test('normalizeIndentation removes common indentation but keeps visual indent', t => {
	const lines = [
		'        function foo() {',
		'            return 42;',
		'        }',
	];

	const result = normalizeIndentation(lines);

	// minIndent = 8, removes 6 (keeps 2 for visual clarity)
	t.deepEqual(result, ['  function foo() {', '      return 42;', '  }']);
});

test('normalizeIndentation preserves relative indentation', t => {
	const lines = ['    class Foo {', '        method() {', '        }', '    }'];

	const result = normalizeIndentation(lines);

	// minIndent = 4, removes 2 (keeps 2 for visual clarity)
	t.deepEqual(result, ['  class Foo {', '      method() {', '      }', '  }']);
});

test('normalizeIndentation handles mixed indentation', t => {
	const lines = [
		'    if (true) {',
		'        console.log("hello");',
		'            console.log("world");',
		'    }',
	];

	const result = normalizeIndentation(lines);

	// minIndent = 4, removes 2 (keeps 2 for visual clarity)
	t.deepEqual(result, [
		'  if (true) {',
		'      console.log("hello");',
		'          console.log("world");',
		'  }',
	]);
});

test('normalizeIndentation caps excessive indentation', t => {
	const lines = [
		'                                    deeply indented',
		'                                        even deeper',
	];

	const result = normalizeIndentation(lines);

	// Should cap at MAX_DISPLAY_INDENT (12) and add indicator
	t.true(result[0]!.includes('»'));
	t.true(result[0]!.includes('deeply indented'));
	t.true(result[1]!.includes('»'));
	t.true(result[1]!.includes('even deeper'));
});

test('normalizeIndentation handles empty lines', t => {
	const lines = ['    function foo() {', '', '        return 42;', '    }'];

	const result = normalizeIndentation(lines);

	// minIndent = 4, removes 2 (keeps 2 for visual clarity)
	t.deepEqual(result, ['  function foo() {', '', '      return 42;', '  }']);
});

test('normalizeIndentation handles whitespace-only lines', t => {
	const lines = ['    function foo() {', '        ', '        return 42;', '    }'];

	const result = normalizeIndentation(lines);

	// minIndent = 4 (whitespace-only lines are skipped), removes 2 (keeps 2)
	t.deepEqual(result, ['  function foo() {', '        ', '      return 42;', '  }']);
});

test('normalizeIndentation handles tabs', t => {
	const lines = ['\t\tfunction foo() {', '\t\t\treturn 42;', '\t\t}'];

	const result = normalizeIndentation(lines);

	// Tabs converted to 2 spaces each: \t\t = 4 spaces
	// minIndent = 4, removes 2 (keeps 2)
	t.deepEqual(result, ['  function foo() {', '    return 42;', '  }']);
});

test('normalizeIndentation handles no indentation', t => {
	const lines = ['function foo() {', '  return 42;', '}'];

	const result = normalizeIndentation(lines);

	t.deepEqual(result, ['function foo() {', '  return 42;', '}']);
});

test('normalizeIndentationString works with string input', t => {
	const content = '        function foo() {\n            return 42;\n        }';

	const result = normalizeIndentationString(content);

	// minIndent = 8, removes 6 (keeps 2)
	t.is(result, '  function foo() {\n      return 42;\n  }');
});

test('normalizeIndentationString handles single line', t => {
	const content = '        const x = 42;';

	const result = normalizeIndentationString(content);

	// minIndent = 8, removes 6 (keeps 2)
	t.is(result, '  const x = 42;');
});

test('normalizeIndentation with very deep nesting shows indicator', t => {
	const lines = [
		'                                                    if (deep) {',
		'                                                        console.log("very deep");',
		'                                                    }',
	];

	const result = normalizeIndentation(lines);

	// All lines should have indicators due to excessive nesting
	for (const line of result) {
		if (line.trim().length > 0) {
			t.true(line.includes('»'), `Line should contain indicator: ${line}`);
		}
	}
});

test('normalizeIndentation handles zero-indent lines mixed with indented', t => {
	const lines = ['export function foo() {', '    return 42;', '}'];

	const result = normalizeIndentation(lines);

	t.deepEqual(result, ['export function foo() {', '    return 42;', '}']);
});
