import {TitledBox, titleStyles} from '@mishieck/ink-titled-box';
import {Text, Box} from 'ink';
import {colors} from '../../config/index.js';

interface HelpProps {
	version: string;
	commands: Array<{name: string; description: string}>;
}

export default function Help({version, commands}: HelpProps) {
	return (
		<TitledBox
			borderStyle="round"
			titles={['/help']}
			titleStyles={titleStyles.pill}
			width={75}
			borderColor={colors.primary}
			paddingX={2}
			paddingY={1}
			flexDirection="column"
			marginBottom={1}
		>
			<Box marginBottom={1}>
				<Text color={colors.primary} bold>
					Nanocoder – {version}
				</Text>
			</Box>

			<Text color={colors.white}>
				A local-first CLI coding agent that brings the power of agentic coding
				tools like Claude Code and Gemini CLI to local models or controlled APIs
				like OpenRouter.
			</Text>

			<Box marginTop={1}>
				<Text color={colors.secondary}>
					Always review model responses, especially when running code. Models
					have read access to files in the current directory and can run
					commands and edit files with your permission.
				</Text>
			</Box>

			<Box marginTop={1}>
				<Text color={colors.primary} bold>
					Common Tasks:
				</Text>
			</Box>
			<Text color={colors.white}>
				{' '}
				• Ask questions about your codebase {'>'} How does foo.py work?
			</Text>
			<Text color={colors.white}> • Edit files {'>'} Update bar.ts to...</Text>
			<Text color={colors.white}> • Fix errors {'>'} cargo build</Text>
			<Text color={colors.white}> • Run commands {'>'} /help</Text>

			<Box marginTop={1}>
				<Text color={colors.primary} bold>
					Commands:
				</Text>
			</Box>
			{commands.length === 0 ? (
				<Text color={colors.white}> No commands available.</Text>
			) : (
				commands.map((cmd, index) => (
					<Text key={index} color={colors.white}>
						{' '}
						• /{cmd.name} - {cmd.description}
					</Text>
				))
			)}
		</TitledBox>
	);
}
