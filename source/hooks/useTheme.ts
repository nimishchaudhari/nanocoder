import type {Colors, ThemePreset} from '@/types/ui';
import {createContext, useContext} from 'react';

interface ThemeContextType {
	currentTheme: ThemePreset;
	colors: Colors;
	setCurrentTheme: (theme: ThemePreset) => void;
}

export const ThemeContext = createContext<ThemeContextType | null>(null);

export function useTheme(): ThemeContextType {
	const context = useContext(ThemeContext);
	if (!context) {
		throw new Error('useTheme must be used within a ThemeProvider');
	}
	return context;
}
