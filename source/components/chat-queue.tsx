import {Box} from 'ink';
import {ReactNode, useMemo, Fragment, memo} from 'react';
import type {ChatQueueProps} from '../types/index.js';

const defaultDisplayCount = 20;

export default memo(function ChatQueue({
	staticComponents = [],
	queuedComponents = [],
	displayCount = defaultDisplayCount,
}: ChatQueueProps) {
	const allComponents = useMemo(() => {
		const totalLength = queuedComponents.length;
		const slicedQueuedComponents = queuedComponents.slice(
			Math.max(totalLength - displayCount, 0),
		);

		const components = [...staticComponents, ...slicedQueuedComponents];
		return components;
	}, [staticComponents, queuedComponents, displayCount]);

	return (
		<Box flexDirection="column">
			{allComponents.map((component, index) => {
				// Use component key if it exists, otherwise generate a fallback key
				const key =
					component &&
					typeof component === 'object' &&
					'key' in component &&
					component.key
						? component.key
						: `component-${index}`;

						return <Fragment key={key}>{component}</Fragment>;
			})}
		</Box>
	);
});
