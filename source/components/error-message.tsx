import {TitledBox, titleStyles} from '@mishieck/ink-titled-box';
import {Text} from 'ink';

import {colors} from '../config/index.js';

export default function ErrorMessage({message}: {message: string}) {
	return (
		<TitledBox
			borderStyle="round"
			titles={['Error']}
			titleStyles={titleStyles.pill}
			width={75}
			borderColor={colors.error}
			paddingX={2}
			paddingY={1}
			flexDirection="column"
			marginBottom={1}
		>
			<Text color={colors.error}>{message}</Text>
		</TitledBox>
	);
}
