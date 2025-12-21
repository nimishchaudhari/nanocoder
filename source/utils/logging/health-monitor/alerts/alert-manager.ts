/**
 * Alert management and sending
 */

import {loggerProvider} from '../../logger-provider.js';
import type {HealthCheckConfig, HealthCheckResult} from '../types.js';

// Get logger instance directly to avoid circular dependencies
const getLogger = () => loggerProvider.getLogger();
const logger = getLogger();

/**
 * Send health alert
 */
export async function sendAlert(
	result: HealthCheckResult,
	config: HealthCheckConfig,
	lastAlert: number | undefined,
	correlationId: string,
): Promise<void> {
	if (!config.alerts.enabled) return;

	// Check cooldown
	if (lastAlert && Date.now() - lastAlert < config.alerts.cooldown) {
		return;
	}

	const alertMessage = `Health Alert: ${result.status.toUpperCase()} - Score: ${
		result.score
	}/100`;
	const alertDetails = {
		status: result.status,
		score: result.score,
		summary: result.summary,
		recommendations: result.recommendations,
		timestamp: result.timestamp,
		correlationId,
	};

	// Send to configured channels
	for (const channel of config.alerts.channels) {
		switch (channel) {
			case 'console':
				logger.error(alertMessage, {
					...alertDetails,
					source: 'health-monitor-alert',
				});
				break;

			case 'file':
				// Could implement file-based alerting
				logger.warn(alertMessage, {
					...alertDetails,
					source: 'health-monitor-alert',
				});
				break;

			case 'webhook':
				if (config.alerts.webhookUrl) {
					try {
						// TODO: implement webhook call here
						logger.info('Webhook alert would be sent', {
							url: config.alerts.webhookUrl,
							correlationId,
							source: 'health-monitor-alert',
						});
					} catch (error) {
						logger.error('Failed to send webhook alert', {
							url: config.alerts.webhookUrl,
							error: error instanceof Error ? error.message : error,
							correlationId,
							source: 'health-monitor-alert',
						});
					}
				}
				break;
		}
	}
}
