/**
 * Feature Flags Configuration
 * 
 * Use this to safely enable/disable features without affecting existing functionality.
 * Set to 'false' when adding new features, then enable once tested.
 */

export const FEATURES = {
    // ✅ Core Features (Always enabled)
    CORE_AUTH: true,
    CORE_TENANTS: true,
    CORE_USERS: true,

    // ✅ Stable Features
    BRAND_INVITE: true,
    USER_INVITE: true,

    // 🧪 New Features (Test before enabling)
    AUDIT_LOG_PAGE: true,       // Super Admin audit log timeline
    BULK_OPERATIONS: false,      // Multi-select actions
    AI_INSIGHTS: false,          // AI-powered analytics
    WEBHOOK_EVENTS: false,       // Real-time callbacks
    TWO_FACTOR_AUTH: false,      // 2FA for admins
} as const;

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof FEATURES): boolean {
    return FEATURES[feature] === true;
}

/**
 * Feature guard for components
 */
export function withFeatureFlag<T>(
    feature: keyof typeof FEATURES,
    enabledValue: T,
    disabledValue: T
): T {
    return isFeatureEnabled(feature) ? enabledValue : disabledValue;
}
