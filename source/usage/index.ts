/**
 * Usage tracking module
 * Tracks and persists token usage statistics
 */

export {
	readUsageData,
	writeUsageData,
	addSession,
	getTodayAggregate,
	getLastNDaysAggregate,
	clearUsageData,
} from './storage.js';

export {
	SessionTracker,
	initializeSession,
	getCurrentSession,
	clearCurrentSession,
} from './tracker.js';

export {
	calculateTokenBreakdown,
	calculateToolDefinitionsTokens,
	getUsageStatusColor,
	formatTokenCount,
} from './calculator.js';

export type {TokenBreakdown} from './types.js';
