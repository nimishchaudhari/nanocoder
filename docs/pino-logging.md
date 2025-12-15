# Pino Logging Implementation - Comprehensive Guide

## Table of Contents

- [Overview](#overview)
- [Key Changes](#key-changes)
  - [New Dependencies](#new-dependencies)
  - [Core Architecture Changes](#core-architecture-changes)
  - [Advanced Features Implemented](#advanced-features-implemented)
  - [File Modifications & Additions](#file-modifications--additions)
- [Technical Benefits](#technical-benefits)
- [Migration Strategy](#migration-strategy)
- [Configuration](#configuration)
- [Usage Examples](#usage-examples)
- [Quick Reference](#quick-reference)
  - [Logger Methods](#logger-methods)
  - [Correlation Functions](#correlation-functions)
  - [Performance Functions](#performance-functions)
  - [Request Tracking](#request-tracking)
  - [Health Monitoring](#health-monitoring)
  - [Log Querying](#log-querying)
- [Configuration Reference](#configuration-reference)
- [Common Issues & Solutions](#common-issues--solutions)
- [Best Practices](#best-practices)
- [API Reference](#api-reference)
  - [Logger Interface](#logger-interface)
  - [Correlation Functions](#correlation-functions-1)
  - [Performance Monitoring](#performance-monitoring)
  - [Request Tracking](#request-tracking-1)
  - [Health Monitoring](#health-monitoring-1)
- [Performance Considerations](#performance-considerations)
- [Security Features](#security-features)
- [Troubleshooting](#troubleshooting)
- [Integration Points](#integration-points)
- [Advanced Features](#advanced-features)
- [Monitoring and Alerting](#monitoring-and-alerting)
- [Support and Resources](#support-and-resources)

## Overview

PR #135 introduces a comprehensive structured logging system using Pino, replacing the basic console logging with an enterprise-grade solution. This implementation brings correlation tracking, performance monitoring, security features, and production-ready logging capabilities to Nanocoder.

## Key Changes

### New Dependencies

The following dependencies have been added:

```json
{
  "pino": "^10.1.0",
  "pino-pretty": "^11.0.0", 
  "pino-roll": "^4.0.0",
  "sonic-boom": "^4.0.0"
}
```

### Core Architecture Changes

#### Pino Integration & Dependency Injection
- Added `LoggerProvider` class for singleton logger management
- Implemented lazy loading to avoid circular dependencies
- Created dynamic import mechanism for safe Pino loading
- Extended Pino's API to support all log levels (fatal, error, warn, info, http, debug, trace)

#### Enhanced Logger Interface
- Structured logging with metadata support
- Child logger functionality with automatic correlation context inheritance
- Async flush and end operations for proper cleanup
- Backward-compatible console facade for gradual migration

### Advanced Features Implemented

#### Correlation & Distributed Tracing
- **Correlation Context Management** (`correlation.ts`):
  - Unique correlation ID generation for request tracking
  - Cross-component request correlation with metadata support
  - Async context preservation across async boundaries
  - HTTP middleware for request correlation
  - Decorator support for function-level correlation tracking

#### Security & Data Protection
- **PII Detection & Redaction** (`redaction.ts`):
  - Automatic detection of sensitive data (emails, phone numbers, SSNs, credit cards)
  - Configurable redaction patterns for custom sensitive fields
  - Email masking with partial preservation
  - Smart PII detection with regex patterns
  - Default redaction rules for common sensitive fields (apiKey, password, token, etc.)

#### Performance Monitoring
- **Performance Metrics** (`performance.ts`):
  - Function execution time tracking with decorators
  - Memory usage monitoring and delta calculation
  - CPU usage tracking with utilization metrics
  - Performance threshold monitoring with configurable alerts
  - Memory leak detection with automatic alerts

#### Request & Operation Tracking
- **Request Monitoring** (`request-tracker.ts`):
  - HTTP request timing and resource usage tracking
  - AI provider call tracking with performance metrics
  - MCP server operation monitoring
  - Database/file operation tracking with duration and size metrics
  - Error rate monitoring and performance statistics

#### Configuration Management
- **Dynamic Configuration** (`config.ts` & `config-reloader.ts`):
  - Environment-specific configurations (development, production, test)
  - Hot-reloading of logging configuration without application restart
  - File-based configuration with validation
  - Runtime configuration updates with change tracking
  - Environment variable overrides for production deployment

#### Transport System
- **Multi-Transport Architecture** (`transports.ts`):
  - Development: File logging with daily rotation and compression
  - Production: File logging with daily rotation and compression
  - Test: File logging with daily rotation and compression
  - Error-specific transport for critical error tracking
  - Audit logging for compliance and security monitoring
  - Buffered transport for high-performance scenarios

#### Health Monitoring
- **System Health Checks** (`health-monitor.ts`):
  - Memory usage monitoring with configurable thresholds
  - Performance metric tracking with degradation alerts
  - Logging system health validation
  - Automated health check scheduling
  - Detailed system metrics collection

### File Modifications & Additions

#### Package Management
- Updated `package.json` and `pnpm-lock.yaml` with logging-related dependencies
- Added development and production transport dependencies
- Included memory-safe and high-performance streaming dependencies

#### Integration Points

**App Component** (`app.tsx`) - Updated with structured logging for:
- Application startup and initialization events
- Mode transitions and state changes
- VS Code integration events
- Error handling with correlation tracking
- Performance monitoring for key operations

**Message Queue** (`message-queue.tsx`) - Enhanced with:
- Structured logging for all message types
- Correlation context preservation
- Performance tracking for UI rendering
- Error context with correlation IDs
- Performance metrics for message processing

**AI SDK Client** (`ai-sdk-client.ts`) - Enhanced with:
- Comprehensive logging for AI operations
- Correlation tracking for requests
- Performance monitoring for model calls
- Error handling with structured context
- Tool execution tracking

**MCP Client** (`mcp-client.ts`) - Enhanced with:
- Detailed logging for MCP operations
- Correlation context for server connections
- Performance tracking for tool execution
- Error handling with structured logging
- Connection lifecycle monitoring

#### Utility Functions
- Created backward-compatible console facade for gradual migration
- Added comprehensive error formatting with structured logging integration
- Implemented log querying and filtering capabilities
- Created performance benchmarking utilities

## Technical Benefits

### Performance Improvements
- **High Performance**: Pino's fast serialization reduces logging overhead
- **Asynchronous Operations**: Non-blocking writes prevent application slowdown
- **Memory Efficient**: Optimized serialization and streaming
- **Buffered Writes**: Reduced I/O operations with SonicBoom streams

### Security Enhancements
- **Automatic Redaction**: PII detection prevents sensitive data logging
- **Configurable Security**: Custom redaction rules for specific needs  
- **Data Compliance**: GDPR-friendly logging with automatic data protection
- **Credential Protection**: Built-in protection for API keys and tokens

### Operational Improvements
- **Production Ready**: File rotation, compression, and retention policies
- **Structured Format**: Machine-readable JSON logs for analysis tools
- **Correlation Tracking**: Distributed tracing across components
- **Health Monitoring**: Automated system health and performance checks
- **Configuration Flexibility**: Environment-specific and runtime configuration changes

## Migration Strategy

### Backward Compatibility
- Maintained console API compatibility through structured facade
- Graceful degradation for error handling in logger initialization
- Environment-specific logging levels and formatting
- Fallback logging mechanisms for critical failure scenarios

### Gradual Adoption
- Structured console facade allows incremental migration
- Correlation context preserves existing logging patterns
- Performance decorators can be added to critical functions incrementally
- Existing `console.log` calls automatically benefit from improved transport

## Configuration

### Environment Variables

```bash
# Logging Configuration (optional)
NANOCODER_LOG_LEVEL=debug
NANOCODER_LOG_TO_FILE=true
NANOCODER_LOG_TO_CONSOLE=true
NANOCODER_LOG_DIR=/custom/path/to/logs
NANOCODER_LOG_TRANSPORTS=default

# Correlation Configuration (optional)
NANOCODER_CORRELATION_DEBUG=false
NANOCODER_CORRELATION_ENABLED=true
NANOCODER_CORRELATION_LEGACY_FALLBACK=false
```

### Configuration Examples

**Development:**
```bash
NANOCODER_LOG_LEVEL=debug
NANOCODER_LOG_TO_FILE=false
NANOCODER_LOG_TO_CONSOLE=true
NANOCODER_CORRELATION_ENABLED=true
NANOCODER_CORRELATION_DEBUG=true
```

**Production:**
```bash
NANOCODER_LOG_LEVEL=info
NANOCODER_LOG_TO_FILE=true
NANOCODER_LOG_TO_CONSOLE=false
NANOCODER_LOG_DIR=/var/log/nanocoder
NANOCODER_CORRELATION_ENABLED=true
NANOCODER_CORRELATION_DEBUG=false
```

## Usage Examples

### Basic Logging

```typescript
import {getLogger} from '@/utils/logging';

const logger = getLogger();

logger.fatal('Critical system failure');
logger.error('Operation failed', {error: new Error('Test error')});
logger.warn('Resource limit approaching');
logger.info('Application started successfully');
logger.http('HTTP request completed');
logger.debug('Debug information', {details: 'verbose'});
logger.trace('Detailed trace information');
```

### Structured Logging

```typescript
logger.info('User login successful', {
    userId: 'user-123',
    ipAddress: '192.168.1.1',
    sessionId: 'session-456',
    authenticationMethod: 'oauth2',
    timestamp: new Date().toISOString()
});
```

### Correlation Context

```typescript
import {withNewCorrelationContext, getCorrelationId} from '@/utils/logging';

await withNewCorrelationContext(async (context) => {
    const correlationId = getCorrelationId();
    logger.info('Operation started', {correlationId});
    
    // All logs within this context will have the same correlation ID
    logger.debug('Processing step 1');
    logger.debug('Processing step 2');
    
    // Child loggers inherit the correlation context
    const childLogger = logger.child({module: 'processing'});
    childLogger.info('Child operation completed');
}, 'parent-correlation-id', {userId: 'user-123'});
```

## Quick Reference

### Logger Methods

```typescript
logger.fatal(msg: string, ...args: any[])
logger.error(msg: string, ...args: any[])
logger.warn(msg: string, ...args: any[])
logger.info(msg: string, ...args: any[])
logger.http(msg: string, ...args: any[])
logger.debug(msg: string, ...args: any[])
logger.trace(msg: string, ...args: any[])
logger.child(bindings: Record<string, any>): Logger
logger.isLevelEnabled(level: LogLevel): boolean
```

### Correlation Functions

```typescript
generateCorrelationId(): string
generateShortCorrelationId(): string
withNewCorrelationContext<T>(fn: (context: CorrelationContext) => T, correlationId?: string, metadata?: Record<string, unknown>): T
getCorrelationId(): string | null
isCorrelationEnabled(): boolean
correlationMiddleware(): (req: any, res: any, next: any) => void
```

### Performance Functions

```typescript
startMetrics(): PerformanceMetrics
endMetrics(metrics: PerformanceMetrics): PerformanceMetrics
formatMemoryUsage(memoryUsage: NodeJS.MemoryUsage): string
calculateMemoryDelta(previous: NodeJS.MemoryUsage, current: NodeJS.MemoryUsage): number
```

### Request Tracking

```typescript
httpTracker.startRequest(request: HttpRequest): string
httpTracker.completeRequest(requestId: string, result: HttpRequestResult): void
httpTracker.failRequest(requestId: string, error: Error): void
aiTracker.startRequest(request: AiRequest): string
aiTracker.completeRequest(requestId: string, result: AiRequestResult): void
mcpTracker.startRequest(request: McpRequest): string
mcpTracker.completeRequest(requestId: string, result: McpRequestResult): void
```

### Health Monitoring

```typescript
healthChecks.quick(): Promise<'healthy' | 'degraded' | 'unhealthy'>
healthChecks.full(): Promise<HealthCheckResult>
healthChecks.metrics(): SystemMetrics
healthChecks.ready(): Promise<boolean>
healthChecks.alive(): boolean
initializeHealthMonitoring(config?: Partial<HealthCheckConfig>): void
```

### Log Querying

```typescript
logQueries.errors(): QueryResult
logQueries.byCorrelation(correlationId: string): QueryResult
logQueries.bySource(source: string): QueryResult
logQueries.byTag(tag: string): QueryResult
logQueries.slowRequests(minDuration: number): QueryResult
logQueries.memoryIntensive(minMemory: number): QueryResult
```

## Configuration Reference

### Environment Variables

```bash
# Logging Configuration
NANOCODER_LOG_LEVEL=debug          # Log level (trace, debug, info, warn, error, fatal)
NANOCODER_LOG_TO_FILE=true         # Enable file logging
NANOCODER_LOG_TO_CONSOLE=true      # Enable console logging
NANOCODER_LOG_DIR=/var/log/nanocoder # Log directory
NANOCODER_LOG_TRANSPORTS=default   # Transport configuration

# Correlation Configuration
NANOCODER_CORRELATION_DEBUG=false   # Debug correlation tracking
NANOCODER_CORRELATION_ENABLED=true  # Enable correlation tracking
NANOCODER_CORRELATION_LEGACY_FALLBACK=false # Disable legacy fallback
```

### Log Levels

```typescript
type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'http' | 'debug' | 'trace' | 'silent';
```

### Configuration Presets

```typescript
// Development (pretty printing, debug level)
createDevelopmentConfig();

// Production (JSON format, error level)
createProductionConfig();

// Test (minimal output, debug level)
createTestConfig();
```

## Common Issues & Solutions

### Issue: Logs not appearing in console

**Solution:**
```typescript
// Check if console logging is enabled
console.log('NANOCODER_LOG_TO_CONSOLE:', process.env.NANOCODER_LOG_TO_CONSOLE);

// Check log level
const config = getLoggerConfig();
console.log('Current log level:', config?.level);

// Try forcing console output
initializeLogger({level: 'debug', pretty: true});
```

### Issue: Performance degradation with logging

**Solution:**
```typescript
// Reduce log level in production
initializeLogger({level: 'info'});

// Disable correlation tracking for high-volume operations
withNewCorrelationContext(async () => {
    // Only use correlation where needed
}, undefined, {performanceSensitive: true});

// Use batch logging for high-frequency operations
const batchLogger = logger.child({batch: true});
batchLogger.info('Batch operation', {items: largeArray});
```

### Issue: Sensitive data in logs

**Solution:**
```typescript
// Add custom redaction rules
initializeLogger({
    redact: ['apiKey', 'token', 'password', 'secret', 'creditCard', 'ssn']
});

// Or create custom redaction rules
const customRules = createRedactionRules(['customField', 'internalId']);
```

### Issue: Missing correlation IDs

**Solution:**
```typescript
// Ensure correlation is enabled
process.env.NANOCODER_CORRELATION_ENABLED = 'true';

// Check current correlation ID
const correlationId = getCorrelationId();
if (!correlationId) {
    console.warn('No correlation context active');
}

// Wrap operations in correlation context
await withNewCorrelationContext(async (context) => {
    console.log('Correlation ID:', context.id);
    // Operation code here
});
```

## Best Practices

### 1. Use Appropriate Log Levels

```typescript
// FATAL - Critical system failures
logger.fatal('Database connection lost');

// ERROR - Operation failures
logger.error('Payment failed', {error, orderId});

// WARN - Potential issues
logger.warn('Memory usage high', {usage: '85%'});

// INFO - Significant events
logger.info('User logged in', {userId});

// DEBUG - Debugging info
logger.debug('Processing step', {step: 1});

// TRACE - Very detailed
logger.trace('Function entered', {params});
```

### 2. Always Use Structured Data

```typescript
// Good
logger.info('User action', {
    userId: '123',
    action: 'login',
    ipAddress: req.ip
});

// Avoid
logger.info('User logged in');
```

### 3. Use Correlation Contexts

```typescript
// Good - wrap operations in correlation context
await withNewCorrelationContext(async () => {
    logger.info('Starting operation');
    // ... operation code
    logger.info('Operation completed');
});

// Avoid - no correlation tracking
logger.info('Starting operation');
// ... operation code
logger.info('Operation completed');
```

### 4. Track Performance

```typescript
// Good - track expensive operations
const metrics = startMetrics();
const result = await expensiveOperation();
const finalMetrics = endMetrics(metrics);
logger.info('Operation completed', {
    duration: finalMetrics.duration,
    memoryDelta: formatMemoryUsage(finalMetrics.memoryUsage)
});

// Avoid - no performance tracking
const result = await expensiveOperation();
logger.info('Operation completed');
```

### 5. Provide Error Context

```typescript
// Good - detailed error context
try {
    await riskyOperation();
} catch (error) {
    logger.error('Operation failed', {
        error: error,
        context: {
            userId: currentUser.id,
            operation: 'riskyOperation',
            parameters: operationParams
        }
    });
}

// Avoid - minimal error info
try {
    await riskyOperation();
} catch (error) {
    logger.error('Operation failed');
}
```

## API Reference

### Logger Interface

```typescript
interface Logger {
    fatal(msg: string, ...args: any[]): void;
    error(msg: string, ...args: any[]): void;
    warn(msg: string, ...args: any[]): void;
    info(msg: string, ...args: any[]): void;
    http(msg: string, ...args: any[]): void;
    debug(msg: string, ...args: any[]): void;
    trace(msg: string, ...args: any[]): void;
    
    child(bindings: Record<string, any>): Logger;
    isLevelEnabled(level: LogLevel): boolean;
}
```

### Correlation Functions

```typescript
// Generate correlation IDs
generateCorrelationId(): string;
generateShortCorrelationId(): string;

// Context management
withNewCorrelationContext<T>(
    fn: (context: CorrelationContext) => T,
    correlationId?: string,
    metadata?: Record<string, unknown>
): T;

getCorrelationId(): string | null;
isCorrelationEnabled(): boolean;

// HTTP middleware
correlationMiddleware(): (req: any, res: any, next: any) => void;
```

### Performance Monitoring

```typescript
// Performance tracking
startMetrics(): PerformanceMetrics;
endMetrics(metrics: PerformanceMetrics): PerformanceMetrics;

// Memory utilities
formatMemoryUsage(memoryUsage: NodeJS.MemoryUsage): string;
calculateMemoryDelta(previous: NodeJS.MemoryUsage, current: NodeJS.MemoryUsage): number;

// Decorators
@trackPerformance()
@trackMemory()
```

### Request Tracking

```typescript
// HTTP request tracking
httpTracker.startRequest(request: HttpRequest): string;
httpTracker.completeRequest(requestId: string, result: HttpRequestResult): void;
httpTracker.failRequest(requestId: string, error: Error): void;

// AI provider tracking
aiTracker.startRequest(request: AiRequest): string;
aiTracker.completeRequest(requestId: string, result: AiRequestResult): void;

// MCP server tracking
mcpTracker.startRequest(request: McpRequest): string;
mcpTracker.completeRequest(requestId: string, result: McpRequestResult): void;
```

### Health Monitoring

```typescript
// Health check functions
healthChecks.quick(): Promise<'healthy' | 'degraded' | 'unhealthy'>;
healthChecks.full(): Promise<HealthCheckResult>;
healthChecks.metrics(): SystemMetrics;
healthChecks.ready(): Promise<boolean>;
healthChecks.alive(): boolean;

// Health monitor configuration
initializeHealthMonitoring(config?: Partial<HealthCheckConfig>): void;
```

## Performance Considerations

### High Performance Features

1. **Pino's Fast Serialization**: Reduces logging overhead with efficient JSON serialization
2. **Asynchronous Operations**: Non-blocking writes prevent application slowdown
3. **Memory Efficient**: Optimized serialization and streaming with SonicBoom
4. **Buffered Writes**: Reduced I/O operations with efficient buffering

### Performance Best Practices

1. **Use appropriate log levels**: Avoid excessive debug/trace logging in production
2. **Batch operations**: Use bulk logging for high-frequency operations
3. **Limit correlation context**: Only use correlation tracking where needed
4. **Monitor performance**: Use the built-in performance monitoring to identify bottlenecks

### Performance Metrics

```typescript
const metrics = healthChecks.metrics();
console.log('Memory usage:', metrics.memory.heapUsagePercent);
console.log('Log rate:', metrics.logging.logRate);
console.log('Request rate:', metrics.requests.requestsPerSecond);
```

## Security Features

### Automatic Redaction

The system automatically detects and redacts sensitive information:

```typescript
logger.info('User login', {
    username: 'john.doe',
    email: 'john.doe@example.com',
    apiKey: 'sk-1234567890', // Automatically redacted
    password: 'secret123',   // Automatically redacted
    token: 'abc123xyz',      // Automatically redacted
});
```

### Custom Redaction Rules

```typescript
const logger = initializeLogger({
    redact: ['apiKey', 'token', 'password', 'secret', 'creditCard']
});

// Or add custom patterns
const customRules = createRedactionRules(['customField', 'internalId']);
```

### PII Detection Patterns

The system includes built-in patterns for:
- Email addresses
- Phone numbers
- Social Security Numbers (SSNs)
- Credit card numbers
- API keys and tokens
- Passwords and secrets

## Troubleshooting

### Common Issues

**Issue: Logs not appearing**
- Check log level configuration
- Verify logger initialization
- Ensure proper correlation context

**Issue: Performance degradation**
- Review log volume and levels
- Check for excessive correlation tracking
- Monitor memory usage

**Issue: Missing correlation IDs**
- Verify correlation is enabled
- Check context boundaries
- Ensure proper middleware setup

### Debugging Tools

```typescript
// Check logger configuration
const config = getLoggerConfig();
console.log('Logger config:', config);

// Check health status
const health = await healthChecks.full();
console.log('Health status:', health);

// Check system metrics
const metrics = healthChecks.metrics();
console.log('System metrics:', metrics);
```

### Error Handling

```typescript
try {
    // Operation that might fail
    await riskyOperation();
} catch (error) {
    // Log with full error context
    logger.error('Operation failed', {
        error: error,
        context: {
            userId: 'user-123',
            operation: 'riskyOperation',
            timestamp: new Date().toISOString()
        }
    });
    
    // Re-throw if needed
    throw error;
}
```

## Integration Points

### App Component Integration

The main application component (`source/app.tsx`) has been enhanced with:
- Structured logging for application startup and initialization
- Mode transitions and state changes
- VS Code integration events
- Error handling with correlation tracking
- Performance monitoring for key operations

### Message Queue Integration

The message queue system (`source/components/message-queue.tsx`) includes:
- Structured logging for all message types
- Correlation context preservation
- Performance tracking for UI rendering
- Error context with correlation IDs
- Performance metrics for message processing

### AI SDK Client Integration

The AI SDK client (`source/ai-sdk-client.ts`) features:
- Comprehensive logging for AI operations
- Correlation tracking for requests
- Performance monitoring for model calls
- Error handling with structured context
- Tool execution tracking

### MCP Client Integration

The MCP client (`source/mcp/mcp-client.ts`) includes:
- Detailed logging for MCP operations
- Correlation context for server connections
- Performance tracking for tool execution
- Error handling with structured logging
- Connection lifecycle monitoring

## Advanced Features

### Custom Transports

```typescript
import {createTransport} from '@/utils/logging/transports';

// Create custom transport
const customTransport = createTransport({
    type: 'file',
    filename: '/var/log/nanocoder/custom.log',
    rotation: 'daily',
    compression: true,
    maxSize: '100m',
    maxFiles: '30d'
});
```

### Log Querying

```typescript
import {logQueries} from '@/utils/logging';

// Query logs by correlation ID
const correlationLogs = logQueries.byCorrelation('corr-123');

// Query error logs
const errorLogs = logQueries.errors();

// Query slow requests
const slowRequests = logQueries.slowRequests(1000);

// Query memory-intensive operations
const memoryIntensive = logQueries.memoryIntensive(100 * 1024 * 1024);
```

### Log Aggregation

```typescript
import {globalLogStorage} from '@/utils/logging';

// Aggregate logs by level
const aggregation = globalLogStorage.aggregate({
    groupBy: 'level',
    aggregations: ['count', 'avgDuration', 'maxDuration']
});

// Aggregate by source
const sourceAggregation = globalLogStorage.aggregate({
    groupBy: 'source',
    aggregations: ['count']
});
```

## Monitoring and Alerting

### Health Monitoring Setup

```typescript
import {initializeHealthMonitoring} from '@/utils/logging';

initializeHealthMonitoring({
    enabled: true,
    interval: 30000, // Check every 30 seconds
    timeout: 5000,
    thresholds: {
        memory: {
            heapUsageWarning: 0.8,      // 80% heap usage
            heapUsageCritical: 0.95,    // 95% heap usage
            externalWarning: 256,       // 256MB external memory
            externalCritical: 512,      // 512MB external memory
        },
        performance: {
            averageDurationWarning: 1000,   // 1s average duration
            averageDurationCritical: 5000,  // 5s average duration
            errorRateWarning: 0.05,         // 5% error rate
            errorRateCritical: 0.1,         // 10% error rate
        },
        // ... other thresholds
    },
    alerts: {
        enabled: true,
        channels: ['console', 'file'],
        cooldown: 300000, // 5 minutes between alerts
    }
});
```

### Health Check Endpoints

```typescript
// Health check endpoint
app.get('/health', healthCheckMiddleware());

// Readiness check
app.get('/health/ready', healthCheckMiddleware());

// Liveness check
app.get('/health/live', healthCheckMiddleware());

// Metrics endpoint
app.get('/metrics', healthCheckMiddleware());
```

### Alert Configuration

```typescript
// Configure alerts for critical issues
initializeHealthMonitoring({
    alerts: {
        enabled: true,
        channels: ['console', 'file', 'webhook'],
        webhookUrl: 'https://alerting.example.com/webhook',
        cooldown: 300000, // 5 minutes
    }
});
```

## Support and Resources

### Documentation

- [Pino Documentation](https://getpino.io/)
- [Node.js AsyncLocalStorage](https://nodejs.org/api/async_hooks.html)
- [Structured Logging Best Practices](https://www.loggly.com/ultimate-guide/structured-logging/)

### Community

- GitHub Issues: Report bugs and request features
- Discord Server: Join for real-time discussions and support
- Contribution Guide: Follow our contribution guidelines

### Troubleshooting Guide

For common issues and solutions, refer to the [Troubleshooting](#troubleshooting) section above or consult the GitHub issue tracker for known issues and resolutions.

## Conclusion

This comprehensive Pino logging implementation provides Nanocoder with enterprise-grade logging capabilities including structured logging, correlation tracking, performance monitoring, security features, and production-ready infrastructure. The system is designed for gradual adoption, backward compatibility, and seamless integration with existing code while providing the foundation for advanced observability and monitoring capabilities.
