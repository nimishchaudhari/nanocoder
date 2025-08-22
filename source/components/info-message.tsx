import {TitledBox, titleStyles} from '@mishieck/ink-titled-box';
import {Text} from 'ink';

import {colors} from '../config/index.js';

export default function InfoMessage({message}: {message: string}) {
	return (
		<TitledBox
			borderStyle="round"
			titles={['Info']}
			titleStyles={titleStyles.pill}
			width={75}
			borderColor={colors.blue}
			paddingX={2}
			paddingY={1}
			flexDirection="column"
			marginBottom={1}
		>
			<Text color={colors.blue}>{message}</Text>
		</TitledBox>
	);
}
