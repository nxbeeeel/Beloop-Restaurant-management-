export { }

declare global {
    interface CustomJwtSessionClaims {
        metadata: {
            onboardingComplete?: boolean
            role?: string
            tenantId?: string
            outletId?: string
        }
    }
}
