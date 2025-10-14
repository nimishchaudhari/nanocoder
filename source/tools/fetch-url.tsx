import {fetch} from 'undici';
import React from 'react';
import {Text, Box} from 'ink';
import type {ToolHandler, ToolDefinition} from '@/types/index';
import {ThemeContext} from '@/hooks/useTheme';
import ToolMessage from '@/components/tool-message';

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

const validator = async (
	args: FetchArgs,
): Promise<{valid: true} | {valid: false; error: string}> => {
	// Validate URL format
	try {
		const parsedUrl = new URL(args.url);

		// Check for valid protocol
		if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
			return {
				valid: false,
				error: `Invalid URL protocol "${parsedUrl.protocol}". Only http: and https: are supported.`,
			};
		}

		// Check for localhost/internal IPs (security consideration)
		const hostname = parsedUrl.hostname.toLowerCase();
		if (
			hostname === 'localhost' ||
			hostname === '127.0.0.1' ||
			hostname === '0.0.0.0' ||
			hostname.startsWith('192.168.') ||
			hostname.startsWith('10.') ||
			hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)
		) {
			return {
				valid: false,
				error: `⚒ Cannot fetch from internal/private network address: ${hostname}`,
			};
		}

		return {valid: true};
	} catch (error: any) {
		return {
			valid: false,
			error: `⚒ Invalid URL format: ${args.url}`,
		};
	}
};

export const fetchUrlTool: ToolDefinition = {
	handler,
	formatter,
	validator,
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
