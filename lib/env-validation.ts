/**
 * Environment Variable Validation
 *
 * Ensures all required environment variables are set at runtime.
 * Prevents the application from starting with missing or invalid configuration.
 */

class EnvValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvValidationError';
  }
}

/**
 * Get a required environment variable or throw an error
 */
export function getRequiredEnv(key: string): string {
  const value = process.env[key];

  if (!value || value.trim() === '') {
    throw new EnvValidationError(
      `Missing required environment variable: ${key}\n` +
      `Please set this variable in your .env file or deployment environment.\n` +
      `See .env.example for reference.`
    );
  }

  return value;
}

/**
 * Get an optional environment variable with a default value
 */
export function getOptionalEnv(key: string, defaultValue: string): string {
  const value = process.env[key];
  return value && value.trim() !== '' ? value : defaultValue;
}

/**
 * Validate environment variables on application startup
 */
export function validateEnvironment(): void {
  const requiredVars = [
    'DATABASE_URL',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'POS_API_SECRET',
  ];

  const missingVars: string[] = [];

  for (const varName of requiredVars) {
    if (!process.env[varName] || process.env[varName]?.trim() === '') {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    throw new EnvValidationError(
      `Missing required environment variables:\n${missingVars.map(v => `  - ${v}`).join('\n')}\n\n` +
      `Please set these variables in your .env file or deployment environment.\n` +
      `See .env.example for reference.`
    );
  }

  // Validate POS_API_SECRET format (must be 64 hex characters = 256 bits)
  const posSecret = process.env.POS_API_SECRET!;
  if (!/^[a-f0-9]{64}$/i.test(posSecret)) {
    console.warn(
      '[SECURITY WARNING] POS_API_SECRET should be a 64-character hex string (256 bits).\n' +
      'Generate one with: openssl rand -hex 32'
    );
  }

  // Validate Redis URL format
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL!;
  if (!redisUrl.startsWith('https://')) {
    throw new EnvValidationError(
      'UPSTASH_REDIS_REST_URL must be a valid HTTPS URL'
    );
  }

  // Warn if using development/test credentials in production
  if (process.env.NODE_ENV === 'production') {
    if (process.env.DATABASE_URL?.includes('localhost')) {
      console.warn('[WARNING] Using localhost database URL in production!');
    }
    if (process.env.CLERK_SECRET_KEY?.includes('test')) {
      console.warn('[WARNING] Using test Clerk credentials in production!');
    }
  }
}

/**
 * Check if running in production environment
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in development environment
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if running in test environment
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}
