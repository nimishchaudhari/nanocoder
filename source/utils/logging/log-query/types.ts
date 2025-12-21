/**
 * Type definitions for log query system
 */

/**
 * Log entry structure for querying
 */
export interface LogEntry {
	timestamp: string;
	level: string;
	message: string;
	correlationId?: string;
	source?: string;
	requestId?: string;
	userId?: string;
	sessionId?: string;
	tags?: string[];
	// biome-ignore lint/suspicious/noExplicitAny: Dynamic log filter
	metadata?: Record<string, any>;
	error?: {
		name?: string;
		message?: string;
		stack?: string;
		type?: string;
	};
	performance?: {
		duration?: number;
		// biome-ignore lint/suspicious/noExplicitAny: Dynamic log filter
		memory?: Record<string, any>;
		cpu?: number;
	};
	request?: {
		method?: string;
		url?: string;
		statusCode?: number;
		duration?: number;
		size?: number;
	};
}

/**
 * Query filters for log searching
 */
export interface LogQuery {
	// Time range
	startTime?: Date;
	endTime?: Date;

	// Log level filtering
	levels?: string[];
	excludeLevels?: string[];

	// Message filtering
	messageContains?: string;
	messageRegex?: RegExp;
	messageStartsWith?: string;
	messageEndsWith?: string;

	// Correlation and request filtering
	correlationIds?: string[];
	requestIds?: string[];
	userIds?: string[];
	sessionIds?: string[];

	// Source and component filtering
	sources?: string[];
	excludeSources?: string[];

	// Tag filtering
	tags?: string[];
	excludeTags?: string[];
	hasTags?: boolean;

	// Metadata filtering
	metadataKey?: string;
	// biome-ignore lint/suspicious/noExplicitAny: Dynamic filter type
	metadataValue?: any;
	metadataExists?: string;

	// Performance filtering
	durationMin?: number;
	durationMax?: number;
	memoryThreshold?: number;

	// Error filtering
	hasErrors?: boolean;
	errorTypes?: string[];

	// Request filtering
	requestMethods?: string[];
	requestStatusCodes?: number[];
	requestDurationMin?: number;
	requestDurationMax?: number;

	// Pagination
	limit?: number;
	offset?: number;
	sortBy?: 'timestamp' | 'level' | 'duration' | 'memory';
	sortOrder?: 'asc' | 'desc';
}

/**
 * Query result with metadata
 */
export interface QueryResult {
	entries: LogEntry[];
	totalCount: number;
	filteredCount: number;
	queryTime: number;
	hasMore: boolean;
	facets?: {
		levels: Record<string, number>;
		sources: Record<string, number>;
		tags: Record<string, number>;
		errorTypes: Record<string, number>;
		hours: Record<string, number>;
	};
}

/**
 * Log aggregation options
 */
export interface AggregationOptions {
	groupBy: 'hour' | 'day' | 'level' | 'source' | 'correlationId' | 'errorType';
	aggregations: (
		| 'count'
		| 'avgDuration'
		| 'maxDuration'
		| 'minDuration'
		| 'sumDuration'
		| 'errorRate'
		| 'memoryUsage'
	)[];
	timeRange?: {
		startTime: Date;
		endTime: Date;
	};
}

/**
 * Log aggregation result
 */
export interface AggregationResult {
	groups: Record<
		string,
		{
			count: number;
			avgDuration?: number;
			maxDuration?: number;
			minDuration?: number;
			sumDuration?: number;
			errorRate?: number;
			memoryUsage?: {
				avgHeapUsed: number;
				maxHeapUsed: number;
				minHeapUsed: number;
			};
			samples?: LogEntry[];
		}
	>;
	totalGroups: number;
	queryTime: number;
}
