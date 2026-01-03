export interface Colors {
	white: string;
	black: string;
	primary: string;
	tool: string;
	secondary: string;
	success: string;
	error: string;
	info: string;
	warning: string;
	// Diff highlight colors
	diffAdded: string;
	diffRemoved: string;
	diffAddedText: string;
	diffRemovedText: string;
}

export interface Theme {
	name: string;
	displayName: string;
	colors: Colors;
}

export type ThemePreset =
	| 'tokyo-night'
	| 'synthwave-84'
	| 'forest-night'
	| 'material-ocean'
	| 'sunset-glow'
	| 'nord-frost'
	| 'rose-pine-dawn'
	| 'neon-jungle'
	| 'midnight-amethyst'
	| 'desert-mirage'
	| 'cherry-blossom'
	| 'electric-storm'
	| 'deep-sea'
	| 'volcanic-ash'
	| 'cyberpunk-mint'
	| 'dracula';

export type TitleShape =
	| 'rounded'
	| 'square'
	| 'double'
	| 'pill'
	| 'arrow-left'
	| 'arrow-right'
	| 'arrow-double'
	| 'angled-box'
	| 'powerline-angled'
	| 'powerline-angled-thin'
	| 'powerline-curved'
	| 'powerline-curved-thin'
	| 'powerline-flame'
	| 'powerline-flame-thin'
	| 'powerline-block'
	| 'powerline-block-thin'
	| 'powerline-segment'
	| 'powerline-segment-thin'
	| 'powerline-rect'
	| 'powerline-rect-thin'
	| 'powerline-graph'
	| 'powerline-block-alt';
