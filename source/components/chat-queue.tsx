import {Box} from 'ink';
import {ReactNode, useMemo} from 'react';

interface ChatQueueProps {
	staticComponents?: ReactNode[];
	queuedComponents?: ReactNode[];
}

export default function ChatQueue({staticComponents = [], queuedComponents = []}: ChatQueueProps) {
	const allComponents = useMemo(() => [...staticComponents, ...queuedComponents], [staticComponents, queuedComponents]);
	
	return (
		<Box flexDirection="column">
			{allComponents.map((component, index) => {
				// Use component key if it exists, otherwise generate a stable key
				const key = component && typeof component === 'object' && 'key' in component && component.key 
					? component.key 
					: `component-${index}`;
				
				return (
					<Box key={key}>
						{component}
					</Box>
				);
			})}
		</Box>
	);
}
