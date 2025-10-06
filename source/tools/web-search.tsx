import {fetch} from 'undici';
import * as cheerio from 'cheerio';
import React from 'react';
import {Text, Box} from 'ink';
import type {ToolHandler, ToolDefinition} from '../types/index.js';
import {ThemeContext} from '../hooks/useTheme.js';
import ToolMessage from '../components/tool-message.js';

interface SearchArgs {
	query: string;
	max_results?: number;
}

interface SearchResult {
	title: string;
	url: string;
	snippet: string;
}

const handler: ToolHandler = async (args: SearchArgs): Promise<string> => {
	const maxResults = args.max_results ?? 10;
	const encodedQuery = encodeURIComponent(args.query);

	try {
		// Use Brave Search - scraper-friendly, no CAPTCHA
		const searchUrl = `https://search.brave.com/search?q=${encodedQuery}`;

		const response = await fetch(searchUrl, {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
				Accept: 'text/html',
			},
			signal: AbortSignal.timeout(10000),
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const html = await response.text();
		const $ = cheerio.load(html);

		const results: SearchResult[] = [];

		// Brave Search uses specific result containers
		$('[data-type="web"]').each((i, elem) => {
			if (results.length >= maxResults) return;

			const $elem = $(elem);

			// Extract title and URL
			const titleLink = $elem.find('a[href^="http"]').first();
			const url = titleLink.attr('href');
			const title = titleLink.text().trim();

			// Extract snippet
			const snippet = $elem.find('.snippet-description').text().trim();

			if (url && title) {
				results.push({
					title: title || 'No title',
					url,
					snippet: snippet || '',
				});
			}
		});

		if (results.length === 0) {
			return `No results found for query: "${args.query}"`;
		}

		// Format results as markdown for easier LLM reading
		let formattedResults = `# Web Search Results: "${args.query}"\n\n`;

		for (let i = 0; i < results.length; i++) {
			const result = results[i];
			formattedResults += `## ${i + 1}. ${result.title}\n\n`;
			formattedResults += `**URL:** ${result.url}\n\n`;
			if (result.snippet) {
				formattedResults += `${result.snippet}\n\n`;
			}
			formattedResults += '---\n\n';
		}

		return formattedResults;
	} catch (error: any) {
		if (error.name === 'AbortError') {
			throw new Error('Search request timeout');
		}

		throw new Error(`Web search failed: ${error.message}`);
	}
};

// Create a component that will re-render when theme changes
const WebSearchFormatter = React.memo(
	({args, result}: {args: any; result?: string}) => {
		const {colors} = React.useContext(ThemeContext)!;
		const query = args.query || 'unknown';
		const maxResults = args.max_results ?? 5;

		// Parse result to count actual results
		let resultCount = 0;
		let estimatedTokens = 0;
		if (result) {
			const matches = result.match(/^## \d+\./gm);
			resultCount = matches ? matches.length : 0;
			estimatedTokens = Math.ceil(result.length / 4);
		}

		const messageContent = (
			<Box flexDirection="column">
				<Text color={colors.tool}>⚒ web_search</Text>

				<Box>
					<Text color={colors.secondary}>Query: </Text>
					<Text color={colors.white}>{query}</Text>
				</Box>

				<Box>
					<Text color={colors.secondary}>Engine: </Text>
					<Text color={colors.white}>Brave Search</Text>
				</Box>

				{result && (
					<>
						<Box>
							<Text color={colors.secondary}>Results: </Text>
							<Text color={colors.white}>
								{resultCount} / {maxResults} results
							</Text>
						</Box>

						<Box>
							<Text color={colors.secondary}>Output: </Text>
							<Text color={colors.white}>~{estimatedTokens} tokens</Text>
						</Box>
					</>
				)}
			</Box>
		);

		return <ToolMessage message={messageContent} hideBox={true} />;
	},
);

const formatter = async (
	args: any,
	result?: string,
): Promise<React.ReactElement> => {
	return <WebSearchFormatter args={args} result={result} />;
};

export const webSearchTool: ToolDefinition = {
	handler,
	formatter,
	requiresConfirmation: false,
	config: {
		type: 'function',
		function: {
			name: 'web_search',
			description:
				'Search the web using Brave Search and return relevant results with URLs, titles, and descriptions. Use this to find up-to-date information, documentation, or answers to questions. Use in conjuction with the `fetch-url` tool to get page information on search results.',
			parameters: {
				type: 'object',
				properties: {
					query: {
						type: 'string',
						description: 'The search query to look up on the web.',
					},
					max_results: {
						type: 'number',
						description:
							'Maximum number of results to return (default: 10, max: 20).',
					},
				},
				required: ['query'],
			},
		},
	},
};
