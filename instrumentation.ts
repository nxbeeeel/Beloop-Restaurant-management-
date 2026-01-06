/**
 * Next.js Instrumentation Hook
 *
 * This file runs once when the Next.js server starts.
 * Perfect for initializing monitoring, validation, and other startup tasks.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on server-side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnvironment } = await import('./lib/env-validation');

    // Validate all required environment variables on startup
    try {
      validateEnvironment();
      console.log('[Startup] Environment validation passed ✓');
    } catch (error) {
      console.error('[Startup] Environment validation failed:');
      console.error(error);
      // Exit the process to prevent running with invalid configuration
      process.exit(1);
    }

    // Initialize Sentry for error tracking
    if (process.env.SENTRY_DSN) {
      const Sentry = await import('@sentry/nextjs');
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV,
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      });
      console.log('[Startup] Sentry initialized ✓');
    }
  }
}
