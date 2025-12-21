/**
 * Fluent query builder for log queries
 */

import {globalLogStorage} from '../storage/log-storage';
import type {LogQuery, QueryResult} from '../types';

/**
 * Log query builder for fluent query construction
 */
export class LogQueryBuilder {
	private query: LogQuery = {};

	/**
	 * Set time range
	 */
	timeRange(startTime: Date, endTime: Date): this {
		this.query.startTime = startTime;
		this.query.endTime = endTime;
		return this;
	}

	/**
	 * Set log levels
	 */
	levels(...levels: string[]): this {
		this.query.levels = levels;
		return this;
	}

	/**
	 * Exclude log levels
	 */
	excludeLevels(...levels: string[]): this {
		this.query.excludeLevels = levels;
		return this;
	}

	/**
	 * Filter by message content
	 */
	messageContains(text: string): this {
		this.query.messageContains = text;
		return this;
	}

	/**
	 * Filter by message regex
	 */
	messageRegex(regex: RegExp): this {
		this.query.messageRegex = regex;
		return this;
	}

	/**
	 * Filter by correlation IDs
	 */
	correlationIds(...ids: string[]): this {
		this.query.correlationIds = ids;
		return this;
	}

	/**
	 * Filter by sources
	 */
	sources(...sources: string[]): this {
		this.query.sources = sources;
		return this;
	}

	/**
	 * Filter by tags
	 */
	tags(...tags: string[]): this {
		this.query.tags = tags;
		return this;
	}

	/**
	 * Require tags
	 */
	hasTags(): this {
		this.query.hasTags = true;
		return this;
	}

	/**
	 * Set pagination
	 */
	limit(limit: number): this {
		this.query.limit = limit;
		return this;
	}

	/**
	 * Set offset
	 */
	offset(offset: number): this {
		this.query.offset = offset;
		return this;
	}

	/**
	 * Set sorting
	 */
	sortBy(
		field: 'timestamp' | 'level' | 'duration' | 'memory',
		order: 'asc' | 'desc' = 'desc',
	): this {
		this.query.sortBy = field;
		this.query.sortOrder = order;
		return this;
	}

	/**
	 * Filter by minimum performance duration
	 */
	durationMin(min: number): this {
		this.query.durationMin = min;
		return this;
	}

	/**
	 * Filter by memory usage threshold
	 */
	memoryThreshold(threshold: number): this {
		this.query.memoryThreshold = threshold;
		return this;
	}

	/**
	 * Execute the query
	 */
	execute(): QueryResult {
		return globalLogStorage.query(this.query);
	}

	/**
	 * Get query as JSON
	 */
	toJSON(): LogQuery {
		return {...this.query};
	}
}

/**
 * Create a new log query builder
 */
export function createLogQuery(): LogQueryBuilder {
	return new LogQueryBuilder();
}
