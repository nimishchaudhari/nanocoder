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
} from './storage';

export {
	SessionTracker,
	initializeSession,
	getCurrentSession,
	clearCurrentSession,
} from './tracker';

export {
	calculateTokenBreakdown,
	calculateToolDefinitionsTokens,
	getUsageStatusColor,
	formatTokenCount,
} from './calculator';

export type {TokenBreakdown} from '../types/usage';
