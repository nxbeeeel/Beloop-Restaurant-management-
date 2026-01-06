/** @type {import('next').NextConfig} */
require("./env.js");
const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
});

// Sentry configuration (optional - only if SENTRY_DSN is set)
const { withSentryConfig } = process.env.NEXT_PUBLIC_SENTRY_DSN
    ? require("@sentry/nextjs")
    : { withSentryConfig: (config) => config };

const nextConfig = {
    reactStrictMode: true,
    transpilePackages: ['lucide-react'],
    typescript: {
        // Type errors must be fixed before production build
        ignoreBuildErrors: false,
    },
    experimental: {
        optimizePackageImports: ['lucide-react', 'date-fns', 'recharts', '@radix-ui/react-icons', '@radix-ui/react-avatar', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        instrumentationHook: true, // Enable environment validation on startup
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'img.clerk.com',
            },
        ],
    },
    // Security headers for production
    async headers() {
        return [
            {
                source: "/api/:path*",
                headers: [
                    // CORS handled by middleware.ts for multi-origin support
                    { key: "X-Robots-Tag", value: "noindex" } // Example dummy header to keep structure or just remove
                ]
            },
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'X-DNS-Prefetch-Control',
                        value: 'on'
                    },
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=63072000; includeSubDomains; preload'
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'SAMEORIGIN'
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff'
                    },
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block'
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'origin-when-cross-origin'
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=()'
                    }
                ]
            }
        ];
    }
};

// Sentry options (only used if DSN is set)
const sentryWebpackPluginOptions = {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    silent: true, // Suppresses source map upload logs
    hideSourceMaps: true,
};

// Chain the configs
const configWithAnalyzer = withBundleAnalyzer(nextConfig);
module.exports = process.env.NEXT_PUBLIC_SENTRY_DSN
    ? withSentryConfig(configWithAnalyzer, sentryWebpackPluginOptions)
    : configWithAnalyzer;

