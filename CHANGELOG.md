# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-12-12

### Added
- **Activity Audit Log Dashboard** - Premium timeline view for Super Admin at `/super/audit`
- **Feature Flags System** - `lib/features.ts` for safe feature rollouts
- **Copy Link in Email Templates** - Brand invite emails now have a copy-paste link section
- **is_provisioned Claim** - Clerk metadata flag for onboarding loop elimination

### Fixed
- **User Deletion** - Now properly deletes Sale/Expense records (non-nullable FK constraint)
- **Onboarding Loop** - Pre-Check Loop Breaker in middleware prevents infinite redirects
- **Brand Admin Redirect** - Proper routing after activation with session reload
- **Error Visibility** - Added onError handlers to frontend mutations

### Security
- **Super Admin ID** - Moved hardcoded ID to `SUPER_ADMIN_CLERK_ID` environment variable
- **Tenant Isolation** - Verified all queries use `ctx.tenantId` for cross-tenant security

### Changed
- **Middleware** - Complete rewrite with enterprise-grade routing logic
- **Email Templates** - Updated to premium dark theme with gradient headers

---

## [1.0.0] - Initial Release

### Features
- Multi-tenant restaurant management system
- Super Admin, Brand Admin, Outlet Manager, Staff roles
- Clerk authentication integration
- tRPC API layer with Prisma ORM
- Premium dark theme UI with shadcn/ui components
