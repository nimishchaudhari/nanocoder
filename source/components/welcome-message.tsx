import {TitledBox, titleStyles} from '@mishieck/ink-titled-box';
import {Box, Text} from 'ink';
import {memo} from 'react';

import {useTheme} from '../hooks/useTheme.js';
import {useTerminalWidth} from '../hooks/useTerminalWidth.js';

import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import BigText from 'ink-big-text';
import Gradient from 'ink-gradient';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read package.json once at module load time to avoid repeated file reads
const packageJson = JSON.parse(
	fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'),
);

export default memo(function WelcomeMessage() {
	const boxWidth = useTerminalWidth();
	const {colors} = useTheme();

	return (
		<>
			<Gradient colors={[colors.primary, colors.tool]}>
				<BigText text="Nanocoder" font="tiny" />
			</Gradient>

			<TitledBox
				key={colors.primary}
				borderStyle="round"
				titles={[`✻ Welcome to Nanocoder ${packageJson.version}`]}
				titleStyles={titleStyles.pill}
				width={boxWidth}
				borderColor={colors.primary}
				paddingX={2}
				paddingY={1}
				flexDirection="column"
				marginBottom={1}
			>
				<Box paddingBottom={1}>
					<Text color={colors.white}>Tips for getting started:</Text>
				</Box>
				<Box paddingBottom={1} flexDirection="column">
					<Text color={colors.secondary}>
						1. Use natural language to describe what you want to build.
					</Text>
					<Text color={colors.secondary}>
						2. Ask for file analysis, editing, bash commands and more.
					</Text>
					<Text color={colors.secondary}>
						3. Be specific as you would with another engineer for best results.
					</Text>
					<Text color={colors.secondary}>
						4. Type /exit or press Ctrl+C to quit.
					</Text>
				</Box>
				<Text color={colors.white}>/help for help</Text>
			</TitledBox>
		</>
	);
});
