import {Text} from 'ink';
import {memo, useState, useEffect} from 'react';

import {colors} from '../config/index.js';
import {TitledBox, titleStyles} from '@mishieck/ink-titled-box';
import {useTerminalWidth} from '../hooks/useTerminalWidth.js';
import {checkForUpdates} from '../utils/update-checker.js';

// Get CWD once at module load time
const cwd = process.cwd();

interface UpdateInfo {
	hasUpdate: boolean;
	currentVersion: string;
	latestVersion?: string;
	updateCommand?: string;
}

export default memo(function Status({
	provider,
	model,
}: {
	provider: string;
	model: string;
}) {
	const boxWidth = useTerminalWidth();
	const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

	useEffect(() => {
		const performUpdateCheck = async () => {
			try {
				const info = await checkForUpdates();
				setUpdateInfo(info);
			} catch (error) {
				// Silent failure - don't show errors for update checks
				setUpdateInfo(null);
			}
		};

		performUpdateCheck();
	}, []);

	return (
		<TitledBox
			borderStyle="round"
			titles={['Status']}
			titleStyles={titleStyles.pill}
			width={boxWidth}
			borderColor={colors.info}
			paddingX={2}
			paddingY={1}
			flexDirection="column"
			marginBottom={1}
		>
			<Text color={colors.info}>
				<Text bold={true}>CWD: </Text>
				{cwd}
			</Text>
			<Text color={colors.success}>
				<Text bold={true}>Provider: </Text>
				{provider}, <Text bold={true}>Model: </Text>
				{model}
			</Text>
			{updateInfo?.hasUpdate && (
				<Text color={colors.warning}>
					<Text bold={true}>Update Available: </Text>v
					{updateInfo.currentVersion} → v{updateInfo.latestVersion}
					{updateInfo.updateCommand && (
						<Text color={colors.secondary}>
							{' '}
							(Run: {updateInfo.updateCommand})
						</Text>
					)}
				</Text>
			)}
		</TitledBox>
	);
});
