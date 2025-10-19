import React, {useState} from 'react';
import {Box, Text} from 'ink';
import SelectInput from 'ink-select-input';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {existsSync} from 'node:fs';

export type ConfigLocation = 'project' | 'global';

interface LocationStepProps {
	onComplete: (location: ConfigLocation, path: string) => void;
	onBack?: () => void;
	projectDir: string;
}

interface LocationOption {
	label: string;
	value: ConfigLocation;
}

export function LocationStep({
	onComplete,
	onBack,
	projectDir,
}: LocationStepProps) {
	const projectPath = join(projectDir, 'agents.config.json');
	const globalPath = join(
		homedir(),
		'.config',
		'nanocoder',
		'agents.config.json',
	);

	const projectExists = existsSync(projectPath);
	const globalExists = existsSync(globalPath);

	const [mode, setMode] = useState<
		'select-location' | 'existing-config' | null
	>(() => {
		// If project config exists, show existing config menu
		if (projectExists) {
			return 'existing-config';
		}
		// If global exists but project doesn't, still show location selection
		// but we'll note the global config exists
		return 'select-location';
	});

	const existingPath = projectExists ? projectPath : globalPath;

	const locationOptions: LocationOption[] = [
		{
			label: `[1] Current project directory (${projectPath})`,
			value: 'project',
		},
		{
			label: `[2] Global user config (${globalPath})`,
			value: 'global',
		},
	];

	const existingConfigOptions = [
		{label: '[1] Edit this configuration', value: 'edit'},
		{label: '[2] Create new config in different location', value: 'new'},
	];

	const handleLocationSelect = (item: LocationOption) => {
		const path = item.value === 'project' ? projectPath : globalPath;
		onComplete(item.value, path);
	};

	const handleExistingConfigSelect = (item: {value: string}) => {
		if (item.value === 'edit') {
			const location: ConfigLocation = projectExists ? 'project' : 'global';
			onComplete(location, existingPath);
		} else if (item.value === 'new') {
			setMode('select-location');
		} else {
			// Cancel
			onBack?.();
		}
	};

	if (mode === 'existing-config') {
		return (
			<Box flexDirection="column" paddingX={2} paddingY={1}>
				<Box marginBottom={1}>
					<Text bold>Configuration found at: </Text>
					<Text color="cyan">{existingPath}</Text>
				</Box>
				<SelectInput
					items={existingConfigOptions}
					onSelect={handleExistingConfigSelect as any}
				/>
			</Box>
		);
	}

	return (
		<Box flexDirection="column" paddingX={2} paddingY={1}>
			<Box marginBottom={1}>
				<Text bold>Where would you like to create your configuration?</Text>
			</Box>
			{globalExists && !projectExists && (
				<Box marginBottom={1}>
					<Text color="yellow">Note: Global config exists at {globalPath}</Text>
				</Box>
			)}
			<SelectInput
				items={locationOptions}
				onSelect={handleLocationSelect as any}
			/>
			<Box marginTop={1}>
				<Text dimColor>
					Tip: Project configs are useful for team settings. Global configs work
					across all projects.
				</Text>
			</Box>
		</Box>
	);
}
