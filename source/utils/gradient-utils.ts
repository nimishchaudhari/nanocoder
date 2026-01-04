import type {Colors} from '@/types/ui';

/**
 * Get gradient colors for a theme, with fallback to primary color if not defined
 * @param colors Theme colors object
 * @returns Array of gradient colors
 */
export function getGradientColors(colors: Colors): string[] {
	return colors.gradientColors && colors.gradientColors.length > 0
		? colors.gradientColors
		: [colors.primary, colors.tool];
}

/**
 * Create a CSS gradient string from gradient colors
 * @param colors Theme colors object
 * @param direction Gradient direction (default: 'to right')
 * @returns CSS gradient string
 */
export function createGradient(
	colors: Colors,
	direction: string = 'to right',
): string {
	const gradientColors = getGradientColors(colors);
	return `linear-gradient(${direction}, ${gradientColors.join(', ')})`;
}

/**
 * Get a specific gradient color by index
 * @param colors Theme colors object
 * @param index Color index
 * @returns Gradient color or fallback color
 */
export function getGradientColor(colors: Colors, index: number = 0): string {
	const gradientColors = getGradientColors(colors);
	return gradientColors[index % gradientColors.length];
}

/**
 * Check if theme has custom gradient colors defined
 * @param colors Theme colors object
 * @returns True if custom gradients are defined
 */
export function hasCustomGradients(colors: Colors): boolean {
	return (
		colors.gradientColors !== undefined && colors.gradientColors.length > 0
	);
}
