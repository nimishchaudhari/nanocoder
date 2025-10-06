import {fetch} from 'undici';
import React from 'react';
import {Text, Box} from 'ink';
import type {ToolHandler, ToolDefinition} from '../types/index.js';
import {ThemeContext} from '../hooks/useTheme.js';
import ToolMessage from '../components/tool-message.js';

interface FetchArgs {
	url: string;
}

const handler: ToolHandler = async (args: FetchArgs): Promise<string> => {
	// Validate URL
	try {
		new URL(args.url);
	} catch {
		throw new Error(`Invalid URL: ${args.url}`);
	}

	// Use Jina AI Reader to convert URL to LLM-friendly markdown
	const jinaUrl = `https://r.jina.ai/${args.url}`;

	try {
		const response = await fetch(jinaUrl, {
			headers: {
				Accept: 'text/plain',
			},
			signal: AbortSignal.timeout(15000), // 15 second timeout
			method: 'GET',
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const content = await response.text();

		if (!content || content.length === 0) {
			throw new Error('No content returned from URL');
		}

		// Limit content size to prevent context overflow (~100KB)
		const maxSize = 100000;
		if (content.length > maxSize) {
			const truncated = content.substring(0, maxSize);
			return `${truncated}\n\n[Content truncated - original size was ${content.length} characters]`;
		}

		return content;
	} catch (error: any) {
		if (error.name === 'AbortError') {
			throw new Error(`Request timeout: URL took too long to fetch (>15s)`);
		}
		throw new Error(`Failed to fetch URL: ${error.message}`);
	}
};

// Create a component that will re-render when theme changes
const FetchUrlFormatter = React.memo(
	({args, result}: {args: any; result?: string}) => {
		const {colors} = React.useContext(ThemeContext)!;
		const url = args.url || 'unknown';

		// Calculate content stats from result
		let contentSize = 0;
		let estimatedTokens = 0;
		let wasTruncated = false;

		if (result) {
			contentSize = result.length;
			estimatedTokens = Math.ceil(contentSize / 4);
			wasTruncated = result.includes('[Content truncated');
		}

		const messageContent = (
			<Box flexDirection="column">
				<Text color={colors.tool}>⚒ fetch_url</Text>

				<Box>
					<Text color={colors.secondary}>URL: </Text>
					<Text color={colors.white}>{url}</Text>
				</Box>

				{result && (
					<>
						<Box>
							<Text color={colors.secondary}>Content: </Text>
							<Text color={colors.white}>
								{contentSize.toLocaleString()} characters (~{estimatedTokens}{' '}
								tokens)
							</Text>
						</Box>

						{wasTruncated && (
							<Box>
								<Text color={colors.warning}>
									⚠ Content was truncated to 100KB
								</Text>
							</Box>
						)}
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
	return <FetchUrlFormatter args={args} result={result} />;
};

export const fetchUrlTool: ToolDefinition = {
	handler,
	formatter,
	requiresConfirmation: false,
	config: {
		type: 'function',
		function: {
			name: 'fetch_url',
			description:
				'Fetch and convert any URL to clean, LLM-friendly markdown text. Useful for reading documentation, articles, or web content. Supports images (with captions) and PDFs.',
			parameters: {
				type: 'object',
				properties: {
					url: {
						type: 'string',
						description: 'The URL to fetch and convert to markdown.',
					},
				},
				required: ['url'],
			},
		},
	},
};
