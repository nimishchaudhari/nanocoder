import {Box, Static} from 'ink';
import {useMemo, Fragment, memo} from 'react';
import type {ChatQueueProps} from '@/types/index';

export default memo(function ChatQueue({
	staticComponents = [],
	queuedComponents = [],
	forceAllStatic = false,
}: ChatQueueProps) {
	// Split components into static (older) and dynamic (recent) messages
	const {staticMessages, recentMessages} = useMemo(() => {
		const totalLength = queuedComponents.length;

		// If forceAllStatic is true, move everything to static (e.g., during tool confirmation)
		// This prevents flicker when overlays like ToolConfirmation appear
		if (forceAllStatic) {
			return {
				staticMessages: queuedComponents,
				recentMessages: [],
			};
		}

		// Keep only the LAST message dynamic (it might be actively streaming/updating)
		// Move ALL older messages to static immediately to prevent re-renders during long responses
		const recentCount = Math.min(1, totalLength);
		const staticCount = Math.max(0, totalLength - recentCount);

		const staticMsgs = queuedComponents.slice(0, staticCount);
		const recentMsgs = queuedComponents.slice(staticCount);

		return {
			staticMessages: staticMsgs,
			recentMessages: recentMsgs,
		};
	}, [queuedComponents, forceAllStatic]);

	// Always show static components (like Status)
	const allStaticComponents = useMemo(
		() => [...staticComponents, ...staticMessages],
		[staticComponents, staticMessages],
	);

	return (
		<Box flexDirection="column">
			{/* Wrap older, unchanging content in Static to prevent re-renders */}
			{allStaticComponents.length > 0 && (
				<Static items={allStaticComponents}>
					{(component, index) => {
						const key =
							component &&
							typeof component === 'object' &&
							'key' in component &&
							component.key
								? component.key
								: `static-${index}`;

						return <Fragment key={key}>{component}</Fragment>;
					}}
				</Static>
			)}

			{/* Recent messages that might still be updating */}
			<Box marginLeft={-1}>
				{recentMessages.map((component, index) => {
					const key =
						component &&
						typeof component === 'object' &&
						'key' in component &&
						component.key
							? component.key
							: `recent-${index}`;

					return <Fragment key={key}>{component}</Fragment>;
				})}
			</Box>
		</Box>
	);
});
