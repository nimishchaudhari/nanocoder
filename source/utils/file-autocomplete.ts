import {exec} from 'node:child_process';
import {promisify} from 'node:util';
import {readFileSync, existsSync} from 'node:fs';
import {join} from 'node:path';
import ignore from 'ignore';

const execAsync = promisify(exec);

interface FileCompletion {
	path: string; // Relative path from cwd
	displayPath: string; // Shortened for display
	score: number; // Fuzzy match score (higher = better match)
	isDirectory: boolean;
}

/**
 * Load and parse .gitignore file, returns an ignore instance
 */
function loadGitignore(cwd: string): ReturnType<typeof ignore> {
	const ig = ignore();
	const gitignorePath = join(cwd, '.gitignore');

	// Always ignore common directories
	ig.add([
		'node_modules',
		'.git',
		'dist',
		'build',
		'coverage',
		'.next',
		'.nuxt',
		'out',
		'.cache',
	]);

	// Load .gitignore if it exists
	if (existsSync(gitignorePath)) {
		try {
			const gitignoreContent = readFileSync(gitignorePath, 'utf-8');
			ig.add(gitignoreContent);
		} catch {
			// Silently fail if we can't read .gitignore
			// The hardcoded ignores above will still apply
		}
	}

	return ig;
}

// Simple cache for file list
interface FileListCache {
	files: string[];
	timestamp: number;
}

let fileListCache: FileListCache | null = null;
const CACHE_TTL = 5000; // 5 seconds

/**
 * Get list of all files in the project (respecting gitignore)
 */
async function getAllFiles(cwd: string): Promise<string[]> {
	// Check cache
	const now = Date.now();
	if (fileListCache && now - fileListCache.timestamp < CACHE_TTL) {
		return fileListCache.files;
	}

	try {
		const ig = loadGitignore(cwd);

		// Use find to list all files, excluding common large directories
		const {stdout} = await execAsync(
			`find . -type f -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" -not -path "*/build/*" -not -path "*/coverage/*" -not -path "*/.next/*" -not -path "*/.nuxt/*" -not -path "*/out/*" -not -path "*/.cache/*"`,
			{cwd, maxBuffer: 1024 * 1024 * 10}, // 10MB buffer
		);

		const allFiles = stdout
			.trim()
			.split('\n')
			.filter(Boolean)
			.map(line => line.replace(/^\.\//, '')) // Remove leading "./"
			.filter(file => !ig.ignores(file)); // Filter by gitignore

		// Update cache
		fileListCache = {
			files: allFiles,
			timestamp: now,
		};

		return allFiles;
	} catch (error) {
		// If find fails, return empty array
		console.error('Failed to list files:', error);
		return [];
	}
}

/**
 * Fuzzy match scoring algorithm
 * Returns a score from 0 to 1000 (higher = better match)
 */
export function fuzzyScore(filePath: string, query: string): number {
	if (!query) {
		return 0;
	}

	const lowerPath = filePath.toLowerCase();
	const lowerQuery = query.toLowerCase();

	// Exact match (highest score)
	if (lowerPath === lowerQuery) {
		return 1000;
	}

	// Exact match of filename (without path)
	const filename = filePath.split('/').pop() || '';
	if (filename.toLowerCase() === lowerQuery) {
		return 900;
	}

	// Path ends with query
	if (lowerPath.endsWith(lowerQuery)) {
		return 850;
	}

	// Filename starts with query
	if (filename.toLowerCase().startsWith(lowerQuery)) {
		return 800;
	}

	// Path starts with query
	if (lowerPath.startsWith(lowerQuery)) {
		return 750;
	}

	// Filename contains query as substring
	if (filename.toLowerCase().includes(lowerQuery)) {
		return 700;
	}

	// Path contains query as substring
	if (lowerPath.includes(lowerQuery)) {
		return 600;
	}

	// Sequential character match (fuzzy)
	// All query characters appear in order in the path
	let pathIndex = 0;
	let queryIndex = 0;
	let lastMatchIndex = -1;
	let consecutiveMatches = 0;

	while (pathIndex < lowerPath.length && queryIndex < lowerQuery.length) {
		if (lowerPath[pathIndex] === lowerQuery[queryIndex]) {
			// Bonus for consecutive matches
			if (pathIndex === lastMatchIndex + 1) {
				consecutiveMatches++;
			} else {
				consecutiveMatches = 1;
			}
			lastMatchIndex = pathIndex;
			queryIndex++;
		}
		pathIndex++;
	}

	// If all query characters matched
	if (queryIndex === lowerQuery.length) {
		// Score based on match density and consecutive matches
		const matchDensity = lowerQuery.length / lowerPath.length;
		const consecutiveBonus = consecutiveMatches * 50;
		return Math.min(500 + matchDensity * 100 + consecutiveBonus, 599);
	}

	// No match
	return 0;
}

/**
 * Extract the current @mention being typed at cursor position
 * Returns the mention text and its position in the input
 */
export function getCurrentFileMention(
	input: string,
	cursorPosition?: number,
): {mention: string; startIndex: number; endIndex: number} | null {
	const pos = cursorPosition ?? input.length;

	// Find the last @ before cursor
	let startIndex = -1;
	for (let i = pos - 1; i >= 0; i--) {
		if (input[i] === '@') {
			startIndex = i;
			break;
		}
		// Stop if we hit whitespace (except for path separators)
		if (input[i] === ' ' || input[i] === '\t' || input[i] === '\n') {
			break;
		}
	}

	if (startIndex === -1) {
		return null;
	}

	// Find the end of the mention (next whitespace or end of string)
	let endIndex = pos;
	for (let i = pos; i < input.length; i++) {
		if (
			input[i] === ' ' ||
			input[i] === '\t' ||
			input[i] === '\n' ||
			input[i] === '@'
		) {
			break;
		}
		endIndex = i + 1;
	}

	// Extract mention text (without the @)
	const fullText = input.substring(startIndex, endIndex);
	const mention = fullText.substring(1); // Remove @ prefix

	// Remove line range suffix if present (e.g., ":10-20")
	const mentionWithoutRange = mention.replace(/:\d+(-\d+)?$/, '');

	return {
		mention: mentionWithoutRange,
		startIndex,
		endIndex,
	};
}

/**
 * Get file completions for a partial path
 */
export async function getFileCompletions(
	partialPath: string,
	cwd: string,
	maxResults: number = 20,
): Promise<FileCompletion[]> {
	// Get all files
	const allFiles = await getAllFiles(cwd);

	// Score each file
	const scoredFiles = allFiles
		.map(file => ({
			path: file,
			displayPath: file.length > 50 ? '...' + file.slice(-47) : file,
			score: fuzzyScore(file, partialPath),
			isDirectory: false, // We're only listing files, not directories
		}))
		.filter(f => f.score > 0) // Only include matches
		.sort((a, b) => {
			// Sort by score (descending)
			if (b.score !== a.score) {
				return b.score - a.score;
			}
			// If scores are equal, sort alphabetically
			return a.path.localeCompare(b.path);
		})
		.slice(0, maxResults); // Limit results

	return scoredFiles;
}

/**
 * Clear the file list cache (useful for testing or when files change)
 */
export function clearFileListCache(): void {
	fileListCache = null;
}
