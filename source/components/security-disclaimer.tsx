import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';

interface SecurityDisclaimerProps {
    onConfirm: () => void;
    onExit: () => void;
}

enum SecurityDisclaimerOption {
    Yes = 'yes',
    No = 'no',
}

export default function SecurityDisclaimer({ onConfirm, onExit }: SecurityDisclaimerProps) {
    // Inline item type kept close to usage to limit scope and improve readability
    const items: { label: string; value: SecurityDisclaimerOption }[] = [
        {
            label: 'Yes, proceed',
            value: SecurityDisclaimerOption.Yes,
        },
        {
            label: 'No, exit',
            value: SecurityDisclaimerOption.No,
        },
    ];

    const handleSelect = (item: { label: string; value: SecurityDisclaimerOption }) => {
        if (item.value === SecurityDisclaimerOption.Yes) {
            onConfirm();
        } else {
            onExit();
        }
    };

    return (
        <Box flexDirection="column" padding={1}>
            <Text bold>Do you trust the files in this folder?</Text>
            <Text>{process.cwd()}</Text>
            <Box marginTop={1}>
                <Text>
                    Nanocoder may read, write, or execute files contained in this directory. This can pose security risks, so only use files from trusted sources.
                </Text>
            </Box>
            <SelectInput items={items} onSelect={handleSelect} />
        </Box>
    );
}