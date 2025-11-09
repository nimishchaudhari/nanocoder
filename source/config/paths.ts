import {xdgData} from 'xdg-basedir';

export function getAppDataPath(): string {
	return `${xdgData}/nanocoder`;
}
