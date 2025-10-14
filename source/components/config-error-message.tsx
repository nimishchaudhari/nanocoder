import {TitledBox, titleStyles} from '@mishieck/ink-titled-box';
import {Text, Box} from 'ink';
import {memo} from 'react';
import chalk from 'chalk';
import {highlight} from 'cli-highlight';

import {useTheme} from '@/hooks/useTheme';
import {useTerminalWidth} from '@/hooks/useTerminalWidth';

interface ConfigErrorMessageProps {
	configPath: string;
	cwdPath?: string;
	isEmptyConfig?: boolean;
}

export default memo(function ConfigErrorMessage({
	configPath,
	cwdPath,
	isEmptyConfig = false,
}: ConfigErrorMessageProps) {
	const boxWidth = useTerminalWidth();
	const {colors} = useTheme();

	const exampleConfig = {
		nanocoder: {
			providers: [
				{
					name: 'ollama',
					baseUrl: 'http://localhost:11434/v1',
					models: ['qwen2.5-coder:32b'],
				},
			],
		},
	};

	const highlightedJson = highlight(JSON.stringify(exampleConfig, null, 2), {
		language: 'json',
		theme: 'default',
	});

	return (
		<Box
			borderStyle="round"
			width={boxWidth}
			borderColor={colors.primary}
			paddingX={2}
			paddingY={1}
			flexDirection="column"
		>
			<Box flexDirection="column">
				<Box flexDirection="column" marginBottom={1}>
					<Text color={colors.error}>
						{isEmptyConfig
							? 'No providers configured in agents.config.json'
							: 'No agents.config.json found'}
					</Text>
				</Box>

				<Box flexDirection="column" marginBottom={1}>
					<Text color={colors.secondary}>
						{isEmptyConfig
							? 'Configuration file location:'
							: 'A default configuration file has been created at:'}
					</Text>
					<Text color={colors.info}>{configPath}</Text>
				</Box>

				<Box flexDirection="column" marginBottom={1}>
					{cwdPath && (
						<>
							<Text color={colors.secondary}>
								<Text bold>Tip: </Text>You can also create a project-specific
								config in:
							</Text>
							<Text color={colors.info}>{cwdPath}</Text>
						</>
					)}
				</Box>

				<Box marginBottom={1}>
					<Text color={colors.secondary}>
						{isEmptyConfig
							? 'Please add at least one provider to the "nanocoder.providers" array.'
							: 'Please edit this file to add your AI provider settings.'}
					</Text>
				</Box>

				<Text color={colors.secondary}>Example configuration:</Text>
				<Box paddingX={1} marginTop={1} marginBottom={1}>
					<Text>{highlightedJson}</Text>
				</Box>

				<Text color={colors.secondary}>
					For more details, visit:{' '}
					{chalk
						.hex(colors.info)
						.underline(
							'https://github.com/Nano-Collective/nanocoder#configuration',
						)}
				</Text>
			</Box>
		</Box>
	);
});
