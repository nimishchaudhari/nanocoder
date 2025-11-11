import test from 'ava';
import {parseMarkdown} from './index.js';
import type {Colors} from '../types/markdown-parser.js';

const mockColors: Colors = {
	primary: '#3b82f6',
	secondary: '#6b7280',
	success: '#10b981',
	error: '#ef4444',
	warning: '#f59e0b',
	info: '#3b82f6',
	white: '#ffffff',
	tool: '#8b5cf6',
};

test('parseMarkdown handles table with long content and line breaks', t => {
	const text = `| Clause | Key Content |
|--------|-------------|
| **Title** | \`MIT License with Attribution\` |
| **Copyright** | © 2025 Nano Collective |
| **Permission Grant** | Free use, copy, modify, merge, publish, distribute, sublicense, sell. |
| **Conditions** | Include the copyright notice and this permission notice in all copies. |
| **Attribution Requirement** | Any usage, reproduction, or distribution must prominently credit: <br>• "Nanocoder" and the original project<br>• Repository link: https://github.com/nano-collective/nanocoder<br>• "Nano Collective and contributors" |
| **Places for Attribution** | • User‑facing documentation (e.g., README, About pages)<br>• Source‑code comments or LICENSE files in derivatives<br>• Public presentations, publications, or distributions |
| **Disclaimer** | Software provided "AS IS" without warranty, express or implied. |
| **Liability Limitation** | No liability for damages, claims, or losses arising from use. |
`;

	const result = parseMarkdown(text, mockColors);

	// Debug: log the actual output
	console.log('Table output:');
	console.log(result);

	// Should contain all clauses (checking for unique parts due to truncation)
	t.true(result.includes('Clause'));
	t.true(result.includes('Key Content'));
	t.true(result.includes('Title'));
	t.true(result.includes('Copyright'));
	t.true(result.includes('Permissi') || result.includes('Permission')); // May be truncated
	t.true(result.includes('Conditio') || result.includes('Conditions')); // May be truncated
	t.true(result.includes('Attribut') || result.includes('Attribution')); // May be truncated
	t.true(result.includes('Places'));
	t.true(result.includes('Disclaim') || result.includes('Disclaimer')); // May be truncated
	t.true(result.includes('Liability'));

	// Should strip HTML and markdown
	t.false(result.includes('<br>'));
	t.false(result.includes('**Title**'));

	// Should have newlines from <br> tags
	t.true(result.includes('\n'));
});
