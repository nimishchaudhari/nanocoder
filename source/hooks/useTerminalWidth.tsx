export const useTerminalWidth = () => {
	// Get current terminal width
	const columns = process.stdout.columns || 80;
	
	// Calculate box width (leave some padding and ensure minimum width)
	const boxWidth = Math.max(Math.min(columns - 4, 120), 40);
	
	return boxWidth;
};