import {Text, Box} from 'ink';
import {memo, useMemo} from 'react';
import {useTheme} from '../hooks/useTheme.js';
import type {AssistantMessageProps} from '../types/index.js';

// Performance optimization: truncate very long messages to prevent input lag
const MAX_MESSAGE_LENGTH = 6000; // characters - beyond this causes input lag
const TRUNCATE_PREVIEW_LENGTH = 3000; // characters to show before truncation

export default memo(function AssistantMessage({
	message,
	model,
}: AssistantMessageProps) {
	const {colors} = useTheme();
	const {displayMessage, wasTruncated, remainingChars} = useMemo(() => {
		if (message.length <= MAX_MESSAGE_LENGTH) {
			return {
				displayMessage: message,
				wasTruncated: false,
				remainingChars: 0,
			};
		}

		// Find a good truncation point (prefer end of line or sentence)
		const truncateAt = TRUNCATE_PREVIEW_LENGTH;
		let cutPoint = truncateAt;

		// Try to find a natural break point near the truncation point
		const searchArea = message.slice(
			Math.max(0, truncateAt - 100),
			truncateAt + 100,
		);
		const lineBreak = searchArea.lastIndexOf('\n');
		const sentenceEnd = searchArea.lastIndexOf('.');
		const paragraphEnd = searchArea.lastIndexOf('\n\n');

		if (paragraphEnd !== -1) {
			cutPoint = truncateAt - 100 + paragraphEnd + 2;
		} else if (lineBreak !== -1) {
			cutPoint = truncateAt - 100 + lineBreak + 1;
		} else if (sentenceEnd !== -1) {
			cutPoint = truncateAt - 100 + sentenceEnd + 1;
		}

		return {
			displayMessage: message.slice(0, cutPoint).trimEnd(),
			wasTruncated: true,
			remainingChars: message.length - cutPoint,
		};
	}, [message]);

	return (
		<Box flexDirection="column" marginBottom={1}>
			<Box>
				<Text color={colors.primary} bold>
					{model}:
				</Text>
			</Box>
			<Text color={colors.white}>{displayMessage}</Text>
			{wasTruncated && (
				<Box marginTop={1} flexDirection="column">
					<Text color={colors.secondary} dimColor>
						... [{remainingChars.toLocaleString()} more characters truncated for
						performance]
					</Text>
					<Text color={colors.info}>
						Scroll up to see the beginning or use terminal's buffer to view full
						response
					</Text>
				</Box>
			)}
		</Box>
	);
});
