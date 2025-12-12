const { createEnv } = require("@t3-oss/env-nextjs");
const { z } = require("zod");

const env = createEnv({
    server: {
        DATABASE_URL: z.string().url(),
        CLERK_SECRET_KEY: z.string().min(1),
        REDIS_URL: z.string().url(),
        // Optional services
        GOOGLE_SERVICE_ACCOUNT_JSON: z.string().optional(),
        R2_ACCOUNT_ID: z.string().optional(),
        PUSHER_KEY: z.string().optional(),
        SENTRY_DSN: z.string().optional(),
        ANALYZE: z.string().optional(),
        INNGEST_EVENT_KEY: z.string().optional(),
        INNGEST_SIGNING_KEY: z.string().optional(),
    },
    client: {
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
        NEXT_PUBLIC_APP_URL: z.string().url(),
    },
    runtimeEnv: {
        DATABASE_URL: process.env.DATABASE_URL,
        CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
        REDIS_URL: process.env.REDIS_URL,
        GOOGLE_SERVICE_ACCOUNT_JSON: process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
        R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
        PUSHER_KEY: process.env.PUSHER_KEY,
        SENTRY_DSN: process.env.SENTRY_DSN,
        ANALYZE: process.env.ANALYZE,
        INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY,
        INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY,
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    },
    skipValidation: !!process.env.SKIP_ENV_VALIDATION,
    emptyStringAsUndefined: true,
});

module.exports = { env };
