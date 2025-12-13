# API Reference

## tRPC Routers

All API calls are made through tRPC. The base URL is `/api/trpc`.

---

## Super Admin Router (`super.*`)

> **Auth Required:** `requireSuper` - Only users with `SUPER` role

### Tenants

| Procedure | Type | Description |
|-----------|------|-------------|
| `super.listTenants` | Query | List all tenants with outlet/user counts |
| `super.getTenantDetails` | Query | Get tenant with outlets, users, payments |
| `super.createTenant` | Mutation | Create new tenant |
| `super.updateTenantStatus` | Mutation | Update subscription status |
| `super.deleteTenant` | Mutation | Delete tenant and all related data |

### Users

| Procedure | Type | Description |
|-----------|------|-------------|
| `super.listAllUsers` | Query | List all users across tenants |
| `super.deleteUser` | Mutation | Delete user and related data |
| `super.suspendUser` | Mutation | Deactivate user access |
| `super.activateUser` | Mutation | Reactivate user access |
| `super.updateUserRole` | Mutation | Change user role |

### Invitations

| Procedure | Type | Description |
|-----------|------|-------------|
| `super.inviteBrand` | Mutation | Send brand invitation email |
| `super.createBrandInvitation` | Mutation | Create invite without email |

### Audit

| Procedure | Type | Description |
|-----------|------|-------------|
| `super.getAuditLogs` | Query | Get paginated audit logs |
| `super.logAuditAction` | Mutation | Create audit log entry |

---

## Public Router (`public.*`)

> **Auth Required:** None (public endpoints)

| Procedure | Type | Description |
|-----------|------|-------------|
| `public.validateBrandInvite` | Query | Validate brand invite token |
| `public.activateBrand` | Mutation | Activate brand from invite |
| `public.validateInvite` | Query | Validate user invite token |
| `public.acceptInvite` | Mutation | Accept user invitation |

---

## Brand Router (`brand.*`)

> **Auth Required:** `requireBrandAdmin` - Must be BRAND_ADMIN with tenantId

| Procedure | Type | Description |
|-----------|------|-------------|
| `brand.getDashboard` | Query | Get brand overview stats |
| `brand.getOutlets` | Query | List outlets for tenant |
| `brand.createOutlet` | Mutation | Create new outlet |

---

## Outlet Router (`outlet.*`)

> **Auth Required:** `requireOutlet` - Must have outletId in context

| Procedure | Type | Description |
|-----------|------|-------------|
| `outlet.getDashboard` | Query | Get outlet overview |
| `outlet.getSales` | Query | Get sales for outlet |
| `outlet.createSale` | Mutation | Record new sale |
| `outlet.getProducts` | Query | Get products for outlet |

---

## Error Codes

| Code | Description |
|------|-------------|
| `NOT_FOUND` | Resource doesn't exist |
| `UNAUTHORIZED` | Not authenticated |
| `FORBIDDEN` | Authenticated but not authorized |
| `BAD_REQUEST` | Invalid input data |
| `INTERNAL_SERVER_ERROR` | Server error |
