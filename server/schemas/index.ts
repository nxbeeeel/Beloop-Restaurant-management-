/**
 * Centralized Zod Schemas
 * Single source of truth for all validation across the application
 */

import { z } from 'zod';

// ============================================================
// USER SCHEMAS
// ============================================================

export const userRoleSchema = z.enum(['SUPER', 'BRAND_ADMIN', 'OUTLET_MANAGER', 'STAFF']);

export const userIdSchema = z.object({
    userId: z.string().min(1, 'User ID is required'),
});

export const userCreateSchema = z.object({
    email: z.string().email('Invalid email address'),
    name: z.string().min(1, 'Name is required').max(100),
    role: userRoleSchema,
    tenantId: z.string().optional(),
    outletId: z.string().optional(),
});

export const userUpdateSchema = z.object({
    userId: z.string(),
    role: userRoleSchema.optional(),
    isActive: z.boolean().optional(),
});

// ============================================================
// TENANT/BRAND SCHEMAS
// ============================================================

export const tenantStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'PAUSED', 'TRIAL', 'PENDING']);

export const tenantIdSchema = z.object({
    tenantId: z.string().min(1, 'Tenant ID is required'),
});

export const tenantCreateSchema = z.object({
    brandName: z.string().min(2, 'Brand name must be at least 2 characters').max(100),
    email: z.string().email('Invalid email address'),
    contactName: z.string().optional(),
});

export const tenantUpdateStatusSchema = z.object({
    tenantId: z.string(),
    status: tenantStatusSchema,
});

export const tenantUpdatePricingSchema = z.object({
    tenantId: z.string(),
    pricePerOutlet: z.number().min(0).optional(),
    currency: z.string().optional(),
    billingCycle: z.string().optional(),
});

// ============================================================
// OUTLET SCHEMAS
// ============================================================

export const outletIdSchema = z.object({
    outletId: z.string().min(1, 'Outlet ID is required'),
});

export const outletCreateSchema = z.object({
    name: z.string().min(2, 'Outlet name must be at least 2 characters').max(100),
    code: z.string().min(2, 'Code must be at least 2 characters').max(10, 'Code must be at most 10 characters'),
    address: z.string().optional(),
    phone: z.string().optional(),
});

export const outletUpdateSchema = z.object({
    id: z.string(),
    name: z.string().min(2).max(100).optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    isPosEnabled: z.boolean().optional(),
});

// ============================================================
// SALE SCHEMAS
// ============================================================

export const saleCreateSchema = z.object({
    outletId: z.string(),
    date: z.date().optional(),
    cashSale: z.number().min(0).optional(),
    bankSale: z.number().min(0).optional(),
    zomatoSale: z.number().min(0).optional(),
    swiggySale: z.number().min(0).optional(),
});

export const saleAdjustmentSchema = z.object({
    saleId: z.string(),
    swiggyPayout: z.number().min(0).optional(),
    zomatoPayout: z.number().min(0).optional(),
    cashWithdrawal: z.number().min(0).optional(),
});

// ============================================================
// INVITATION SCHEMAS
// ============================================================

export const invitationCreateSchema = z.object({
    email: z.string().email('Invalid email address'),
    role: userRoleSchema,
    tenantId: z.string().optional(),
    outletId: z.string().optional(),
});

export const invitationIdSchema = z.object({
    invitationId: z.string().min(1),
});

// ============================================================
// PRODUCT SCHEMAS
// ============================================================

export const productCreateSchema = z.object({
    outletId: z.string(),
    name: z.string().min(1, 'Product name is required').max(100),
    sku: z.string().optional(),
    price: z.number().min(0, 'Price must be positive'),
    cost: z.number().min(0).optional(),
    category: z.string().optional(),
    isActive: z.boolean().default(true),
});

export const productUpdateSchema = z.object({
    id: z.string(),
    name: z.string().min(1).max(100).optional(),
    price: z.number().min(0).optional(),
    cost: z.number().min(0).optional(),
    category: z.string().optional(),
    isActive: z.boolean().optional(),
});

// ============================================================
// SUPPORT TICKET SCHEMAS
// ============================================================

export const ticketPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const ticketCategorySchema = z.enum(['BUG', 'FEATURE', 'BILLING', 'OTHER']);
export const ticketStatusSchema = z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']);

export const ticketCreateSchema = z.object({
    subject: z.string().min(1, 'Subject is required').max(200),
    description: z.string().min(1, 'Description is required'),
    priority: ticketPrioritySchema.default('MEDIUM'),
    category: ticketCategorySchema,
});

export const ticketUpdateSchema = z.object({
    ticketId: z.string(),
    status: ticketStatusSchema.optional(),
    priority: ticketPrioritySchema.optional(),
    assignedTo: z.string().optional(),
});

// ============================================================
// PAGINATION SCHEMAS
// ============================================================

export const paginationSchema = z.object({
    limit: z.number().min(1).max(100).default(20),
    cursor: z.string().nullish(),
});

export const searchSchema = z.object({
    search: z.string().optional(),
});

// ============================================================
// TYPE EXPORTS
// ============================================================

export type UserRole = z.infer<typeof userRoleSchema>;
export type TenantStatus = z.infer<typeof tenantStatusSchema>;
export type TicketPriority = z.infer<typeof ticketPrioritySchema>;
export type TicketCategory = z.infer<typeof ticketCategorySchema>;
export type TicketStatus = z.infer<typeof ticketStatusSchema>;
