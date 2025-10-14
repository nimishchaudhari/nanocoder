import {Command} from '@/types/index';
import React from 'react';
import UpdateMessage from '@/components/update-message';

export const updateCommand: Command = {
	name: 'update',
	description: 'Update Nanocoder to the latest version',
	handler: async (_args: string[]) => {
		return React.createElement(UpdateMessage);
	},
};
