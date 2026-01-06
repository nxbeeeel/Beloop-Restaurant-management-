# Beloop ERP - Complete System Documentation

## 1. Complete Database Schema (54 Tables)

### Core Multi-Tenancy
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `Platform` | Platform-level config | id, name |
| `PlatformAdmin` | Super admin users | email, role |
| `Tenant` | Brand/Company | slug, name, stripeCustomerId, subscriptionStatus |
| `Outlet` | Physical location | tenantId, name, code, isPosEnabled |
| `User` | All system users | clerkId, role, tenantId, outletId |

### Sales & Orders
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `Sale` | Daily sales records | outletId, date, cashSale, bankSale, totalSale |
| `Order` | POS orders | outletId, status, totalAmount, paymentMethod, kitchenStatus |
| `OrderItem` | Order line items | orderId, productId, quantity, price |
| `OrderPayment` | Split payments | orderId, amount, method |
| `DailyClosure` | End-of-day closing | outletId, date, declaredCash, variance |

### Inventory & Products
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `Product` | Menu items | outletId, sku, name, price, currentStock |
| `Category` | Product categories | outletId, name |
| `Ingredient` | Raw materials | outletId, purchaseUnit, usageUnit, stock |
| `RecipeItem` | Product recipes | productId, ingredientId, quantity |
| `StockMove` | Stock movements | productId, qty, type (PURCHASE/SALE/WASTE) |
| `Wastage` | Stock wastage | productId, qty, reason |
| `StockCheck` | Physical counts | outletId, performedBy, date |
| `StockCheckItem` | Count line items | productId, countedQty, difference |
| `StockVerification` | Opening/closing verification | outletId, type, verifiedBy |

### Procurement & Suppliers
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `Supplier` | Vendor master | tenantId, name, whatsappNumber |
| `PurchaseOrder` | POs | outletId, supplierId, status, totalAmount |
| `POItem` | PO line items | poId, productId, qty, unitCost |
| `SupplierPayment` | Payments to vendors | supplierId, amount, method |

### Expenses
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `Expense` | Expense records | outletId, category, amount, paymentMethod |

### Financial Ledger (Double-Entry)
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `FinancialAccount` | Chart of Accounts | outletId, name, type (ASSET/LIABILITY/etc) |
| `JournalEntry` | Journal headers | outletId, date, referenceType |
| `JournalLine` | Debit/Credit lines | journalId, accountId, debit, credit |
| `Payment` | Platform payments | tenantId, amount, status |

### Analytics (Pre-Aggregated)
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `MonthlySummary` | Monthly rollup | outletId, month, totalSales, profitMargin |
| `MonthlyMetric` | Phoenix Phase 3 cube | tenantId, month, topItems (JSON) |
| `DailyBrandMetric` | Brand daily rollup | tenantId, date, totalRevenue |
| `DailyOutletMetric` | Outlet daily rollup | outletId, date, totalRevenue |
| `HistoricalInventorySummary` | Inventory snapshot | outletId, date, closingValue |

### CRM & Loyalty
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `Customer` | Customer master | tenantId, phoneNumber, name |
| `LoyaltyProgress` | Stamp/points tracker | customerId, stamps, totalSpend |
| `LoyaltyRule` | Loyalty config | outletId, visitsRequired, rewardValue |
| `Discount` | Coupons/promos | outletId, code, type, value |

### Shift & Cash Management
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `Shift` | Staff shifts | outletId, userId, openingCash, closingCash |
| `CashDrawerTransaction` | Cash in/out | shiftId, type, amount |

### Velocity Mini-ERP Module
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `VelocityRegister` | Daily register | outletId, date, openingCash, status |
| `VelocityTransaction` | All txns | registerId, type, amount, paymentMode |
| `VelocityCategory` | Expense categories | outletId, name, requiresRef |
| `VelocityWallet` | Cash wallets | outletId, type (REGISTER/MANAGER_SAFE) |
| `VelocityTransfer` | Wallet transfers | sourceWalletId, amount, authorizedBy |

### Admin & Support
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `Invitation` | User invites | token, inviteRole, status |
| `BrandInvitation` | Brand onboarding | token, brandName, email |
| `BrandApplication` | Self-signup apps | brandName, email, status |
| `Ticket` | Support tickets | tenantId, subject, status, priority |
| `TicketComment` | Ticket replies | ticketId, content |
| `AuditLog` | Change tracking | tableName, recordId, oldValue, newValue |
| `TemporaryPassword` | Temp passwords | userId, passwordHash, expiresAt |
| `SaleArchive` | Archived sales | outletId, month, data (JSON) |

---

## 2. All Microservices/Modules (30 tRPC Routers)

### Core Business
| Module | Router | Purpose |
|--------|--------|---------|
| **Dashboard** | `dashboard` | Stats, alerts, summaries |
| **Sales** | `sales` | Manual sales entry |
| **Expenses** | `expenses` | Expense tracking |
| **Reports** | `reports` | Financial reports |
| **Analytics** | `analytics`, `brandAnalytics`, `superAnalytics` | Insights |

### Inventory & Stock
| Module | Router | Purpose |
|--------|--------|---------|
| **Products** | `products` | Menu management |
| **Categories** | `categories` | Product categorization |
| **Ingredients** | `ingredients` | Raw material management |
| **Inventory** | `inventory` | Stock levels |
| **Stock Verification** | `stockVerification` | Physical counts |
| **Wastage** | `wastage` | Wastage tracking |
| **Adjustments** | `adjustments` | Stock adjustments |

### Procurement
| Module | Router | Purpose |
|--------|--------|---------|
| **Suppliers** | `suppliers` | Vendor management |
| **Procurement** | `procurement` | Purchase orders |
| **Payments** | `payments` | Supplier payments |

### POS & Operations
| Module | Router | Purpose |
|--------|--------|---------|
| **POS** | `pos` | Point of Sale (1453 lines) |
| **Customers** | `customers` | CRM |
| **Daily Closure** | `dailyClosure` | End-of-day |

### Finance
| Module | Router | Purpose |
|--------|--------|---------|
| **Ledger** | `ledger` | Double-entry accounting |

### Admin
| Module | Router | Purpose |
|--------|--------|---------|
| **Outlets** | `outlets` | Outlet management |
| **Tenant** | `tenant` | Tenant settings |
| **Brand** | `brand` | Brand admin functions |
| **Super Admin** | `superAdmin` | Platform management |
| **Support** | `support` | Ticket system |
| **Audit** | `audit` | Audit logs |

### Public/Onboarding
| Module | Router | Purpose |
|--------|--------|---------|
| **Public** | `public` | Public endpoints |
| **Brand Application** | `brandApplication` | Self-signup |
| **Google Sheets** | `googleSheets` | Sheets export |

---

## 3. Tech Stack Versions

### Beloop Tracker (Main App)
| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.0.7 | React Framework |
| **React** | 19.1.0 | UI Library |
| **TypeScript** | 5.x | Type Safety |
| **Prisma** | 6.19.0 | Database ORM |
| **tRPC** | 11.0.0-rc.477 | Type-safe API |
| **@tanstack/react-query** | 5.0.0 | Data Fetching |
| **Clerk** | 6.0.0 | Authentication |
| **Upstash Redis** | 1.36.0 | Caching |
| **Inngest** | 3.47.0 | Background Jobs |
| **Tailwind CSS** | 3.4.1 | Styling |
| **Sentry** | 8.55.0 | Error Tracking |
| **Zod** | 3.23.8 | Validation |
| **Framer Motion** | 12.23.24 | Animations |
| **Recharts** | 3.5.0 | Charts |
| **Resend** | 6.5.2 | Email |

### BEloop POS (Tablet App)
| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.0.7 | Framework |
| **React** | 19.1.0 | UI |
| **Capacitor** | 8.0.0 | Native Android |
| **next-pwa** | 10.2.9 | Offline PWA |
| **Zustand** | 4.4.0 | State Management |
| **react-to-print** | 3.2.0 | Receipt Printing |

---

## 4. Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      PRODUCTION                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │   Vercel    │     │   Vercel    │     │   Clerk     │   │
│  │  (Tracker)  │     │   (POS)     │     │   (Auth)    │   │
│  │belooprms.app│     │ pos.beloop  │     │  clerk.com  │   │
│  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘   │
│         │                    │                   │          │
│         └────────────┬───────┴───────────────────┘          │
│                      │                                       │
│  ┌───────────────────▼───────────────────────────────────┐  │
│  │                    tRPC API Layer                      │  │
│  │              (34 Routers, HMAC for POS)               │  │
│  └───────────────────┬───────────────────────────────────┘  │
│                      │                                       │
│  ┌───────────┬───────┴───────┬───────────────┐              │
│  │           │               │               │              │
│  ▼           ▼               ▼               ▼              │
│ ┌────┐   ┌────────┐    ┌──────────┐    ┌─────────┐         │
│ │Neon│   │Upstash │    │ Inngest  │    │ Resend  │         │
│ │ DB │   │ Redis  │    │ (Jobs)   │    │ (Email) │         │
│ └────┘   └────────┘    └──────────┘    └─────────┘         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Hosting Details
| Service | Provider | Region | Purpose |
|---------|----------|--------|---------|
| **Tracker App** | Vercel | Auto | Main web app |
| **POS App** | Vercel | Auto | POS tablet app |
| **Database** | Neon PostgreSQL | ap-southeast-1 (Singapore) | Primary DB |
| **Redis Cache** | Upstash | Auto | Caching layer |
| **Auth** | Clerk | Global | Authentication |
| **Background Jobs** | Inngest | - | Async processing |
| **Emails** | Resend | - | Transactional email |
| **Error Tracking** | Sentry | - | Error monitoring |

### Connection Strings (.env)
```
DATABASE_URL = Neon Pooler (ap-southeast-1)
REDIS = Upstash (sharing-monarch-42412)
CLERK = Production keys
INNGEST = Event-driven jobs
```

---

## 5. Scale Metrics (Estimated)

> Note: These would need a database query to get exact numbers.

| Metric | Typical Range | Notes |
|--------|---------------|-------|
| **Tenants (Brands)** | 10-50 | Multi-tenant |
| **Outlets per Brand** | 1-20 | Varies by brand |
| **Total Outlets** | 50-200 | Active outlets |
| **Staff Users** | 100-500 | All roles |
| **Products per Outlet** | 20-100 | Menu items |
| **Orders per Day** | 50-500/outlet | POS transactions |
| **Total Orders/Month** | 50K-500K | Platform-wide |

### Performance Capacity
| Feature | Capacity | Implementation |
|---------|----------|----------------|
| **API Response** | <50ms cached | Redis SWR |
| **Order Processing** | Async | Inngest queue |
| **Concurrent Users** | 1000+ | Neon pooler |
| **Cache TTL** | 5min (dashboard) | Upstash Redis |
