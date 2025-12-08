import { randomBytes } from 'crypto';

/**
 * Generate a unique trace ID for request tracking
 * Format: YYYYMMDD-HHMMSS-RANDOM
 */
export function generateTraceId(): string {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const time = now.toISOString().slice(11, 19).replace(/:/g, '');
    const random = randomBytes(4).toString('hex');
    return `${date}-${time}-${random}`;
}

/**
 * Log with trace ID prefix
 */
export function logWithTrace(traceId: string, level: 'info' | 'error' | 'warn', message: string, data?: any) {
    const prefix = `[TRACE:${traceId}]`;
    const logData = data ? `${message} ${JSON.stringify(data)}` : message;

    switch (level) {
        case 'info':
            console.log(`${prefix} ${logData}`);
            break;
        case 'error':
            console.error(`${prefix} ${logData}`);
            break;
        case 'warn':
            console.warn(`${prefix} ${logData}`);
            break;
    }
}
