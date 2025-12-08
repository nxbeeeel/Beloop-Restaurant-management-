/**
 * Immutable Role Configuration
 * Version-controlled, compile-time safe role definitions
 */

export const ROLE_PRIORITY = {
    SUPER: 1000,
    BRAND_ADMIN: 2000,
    OUTLET_MANAGER: 3000,
    STAFF: 4000,
} as const;

export type UserRole = keyof typeof ROLE_PRIORITY;

export const ROLE_ROUTES = {
    SUPER: '/super/dashboard',
    BRAND_ADMIN: '/brand/dashboard',
    OUTLET_MANAGER: '/outlet/dashboard',
    STAFF: '/outlet/orders',
} as const;

/**
 * Get the target route for a given role
 * @param role - User role
 * @returns Target dashboard route
 */
export function getRouteForRole(role: UserRole): string {
    return ROLE_ROUTES[role];
}

/**
 * Get role priority (lower number = higher priority)
 * @param role - User role
 * @returns Priority number
 */
export function getRolePriority(role: UserRole): number {
    return ROLE_PRIORITY[role];
}

/**
 * Check if a role has higher priority than another
 * @param role1 - First role
 * @param role2 - Second role
 * @returns True if role1 has higher priority (lower number)
 */
export function hasHigherPriority(role1: UserRole, role2: UserRole): boolean {
    return ROLE_PRIORITY[role1] < ROLE_PRIORITY[role2];
}
