/**
 * Health check middleware for HTTP servers
 */

/**
 * Health check middleware for HTTP servers
 */
export function healthCheckMiddleware(healthChecks: {
	full: () => Promise<{
		status: 'healthy' | 'degraded' | 'unhealthy';
		timestamp: string;
		score: number;
		checks: Array<{
			name: string;
			status: 'pass' | 'fail' | 'warn';
			score: number;
		}>;
	}>;
	ready: () => Promise<boolean>;
	alive: () => boolean;
	metrics: () => unknown;
}) {
	return async (
		req: {path: string},
		res: {
			status: (code: number) => {
				json: (data: unknown) => void;
			};
			json: (data: unknown) => void;
		},
		next: () => void,
	) => {
		if (req.path === '/health') {
			try {
				const health = await healthChecks.full();
				const statusCode =
					health.status === 'healthy'
						? 200
						: health.status === 'degraded'
							? 200
							: 503;

				res.status(statusCode).json({
					status: health.status,
					timestamp: health.timestamp,
					score: health.score,
					checks: health.checks.map(check => ({
						name: check.name,
						status: check.status,
						score: check.score,
					})),
				});
			} catch (error) {
				res.status(503).json({
					status: 'unhealthy',
					timestamp: new Date().toISOString(),
					error: error instanceof Error ? error.message : 'Unknown error',
				});
			}
		} else if (req.path === '/health/ready') {
			const ready = await healthChecks.ready();
			const statusCode = ready ? 200 : 503;
			res.status(statusCode).json({ready});
		} else if (req.path === '/health/live') {
			const alive = healthChecks.alive();
			const statusCode = alive ? 200 : 503;
			res.status(statusCode).json({alive});
		} else if (req.path === '/metrics') {
			const metrics = healthChecks.metrics();
			res.json(metrics);
		} else {
			next();
		}
	};
}
