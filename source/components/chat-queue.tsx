import {Box} from 'ink';
import {ReactNode} from 'react';

interface ChatQueueProps {
	staticComponents?: ReactNode[];
	queuedComponents?: ReactNode[];
}

export default function ChatQueue({staticComponents = [], queuedComponents = []}: ChatQueueProps) {
	const allComponents = [...staticComponents, ...queuedComponents];
	
	return (
		<Box flexDirection="column">
			{allComponents.map((component, index) => (
				<Box key={index}>
					{component}
				</Box>
			))}
		</Box>
	);
}
