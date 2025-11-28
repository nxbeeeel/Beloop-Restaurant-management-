# Outlet Manager & Staff Pages - Complete Implementation Plan

## Current State Analysis

### What's Working ✅
- Layout with sidebar navigation exists
- tRPC routers are set up (sales, expenses, dailyClosure, googleSheets, etc.)
- Database schema is complete
- Authentication and role-based access control

### What's Broken/Missing ❌
1. **Expense Entry** - No form to add expenses (only viewing list)
2. **Google Sheets Settings** - Page exists but not linked in navigation
3. **Type errors** - ExpenseEntryForm has TypeScript errors with string types
4. **Staff Access** - Layout only allows OUTLET_MANAGER, blocks STAFF
5. **Suppliers Page** - Exists but may not be fully functional
6. **Navigation** - Missing links to Suppliers and Sheet Settings

---

## Implementation Plan

### Phase 1: Fix Core Functionality (Priority: CRITICAL)

#### Task 1.1: Fix ExpenseEntryForm Type Errors
**File**: `components/expenses/ExpenseEntryForm.tsx`
- Fix category and paymentMethod state to use proper types
- Change from `string` to specific union types matching Prisma enums
- Add proper type casting for Select component values

#### Task 1.2: Integrate Expense Entry into Expenses Page
**File**: `app/(outlet)/outlet/expenses/page.tsx`
- Make it a client component wrapper
- Add ExpenseEntryForm at the top
- Keep the expenses list below
- Add proper data refresh after new expense

#### Task 1.3: Fix Layout Access Control
**File**: `app/(outlet)/layout.tsx`
- Allow both OUTLET_MANAGER and STAFF roles
- Show different navigation items based on role
- STAFF: Limited to Sales Entry, Expenses, Daily Closing
- MANAGER: Full access including Suppliers, Orders, Settings

---

### Phase 2: Complete Navigation & Settings (Priority: HIGH)

#### Task 2.1: Add Missing Navigation Links
**File**: `app/(outlet)/layout.tsx`
Add to navigation:
- Suppliers (Manager only)
- Sheet Settings (Manager only)
- Proper active state highlighting

#### Task 2.2: Verify Google Sheets Settings Page
**File**: `app/(outlet)/outlet/settings/sheets/page.tsx`
- Ensure tRPC endpoints work
- Test save functionality
- Add success/error feedback

---

### Phase 3: Enhance User Experience (Priority: MEDIUM)

#### Task 3.1: Improve Daily Closing Flow
**File**: `app/(outlet)/outlet/close-daily/DailyCloseForm.tsx`
- Ensure it fetches sales and expenses correctly
- Show clear reconciliation
- Add export to Google Sheets button (if configured)

#### Task 3.2: Create Unified Expenses Page
**File**: `app/(outlet)/outlet/expenses/page.tsx`
- Convert to client component
- Add tabs: "Add Expense" | "View History"
- Add date range filter
- Add category filter
- Show totals by category

#### Task 3.3: Enhance Sales Entry
**File**: `components/sales/SalesEntryForm.tsx`
- Add validation feedback
- Show previous day's sales for reference
- Add quick fill from yesterday feature

---

### Phase 4: Mobile Responsiveness (Priority: MEDIUM)

#### Task 4.1: Mobile Navigation
- Convert sidebar to bottom navigation on mobile
- Add hamburger menu for mobile
- Ensure all forms work on mobile

#### Task 4.2: Mobile-Optimized Forms
- Stack form fields vertically on mobile
- Larger touch targets
- Better keyboard handling

---

### Phase 5: Data Integration & Reporting (Priority: LOW)

#### Task 5.1: Dashboard Enhancements
**File**: `app/(outlet)/outlet/dashboard/page.tsx`
- Add charts for sales trends
- Show expense breakdown
- Add profit/loss summary
- Quick actions (Add Sale, Add Expense)

#### Task 5.2: Sales History Page
**File**: `app/(outlet)/outlet/sales/page.tsx`
- Create if missing
- Show sales by date
- Add edit functionality
- Export to CSV/PDF

---

## Immediate Action Items (Next 30 minutes)

### 1. Fix Type Errors in ExpenseEntryForm ⚡
```typescript
// Change state types
const [category, setCategory] = useState<ExpenseCategory | "">("");
const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");

// Type the mutation call properly
createExpense.mutate({
    category: category as ExpenseCategory,
    paymentMethod: paymentMethod as PaymentMethod,
    // ... rest
});
```

### 2. Create Client Wrapper for Expenses Page ⚡
```typescript
// New file: app/(outlet)/outlet/expenses/ClientExpensesPage.tsx
"use client";
import ExpenseEntryForm from "@/components/expenses/ExpenseEntryForm";
import ExpensesList from "@/components/expenses/ExpensesList";

export default function ClientExpensesPage({ 
    outletId, 
    initialExpenses 
}: { 
    outletId: string; 
    initialExpenses: any[] 
}) {
    return (
        <div className="space-y-8">
            <ExpenseEntryForm outletId={outletId} />
            <ExpensesList initialData={initialExpenses} outletId={outletId} />
        </div>
    );
}
```

### 3. Update Layout for STAFF Access ⚡
```typescript
// Change line 19 from:
if (!user || user.role !== "OUTLET_MANAGER") {

// To:
if (!user || (user.role !== "OUTLET_MANAGER" && user.role !== "STAFF")) {
```

### 4. Add Navigation Links ⚡
Add to layout navigation:
- Suppliers link (Manager only)
- Sheet Settings link (Manager only)

---

## Success Criteria

### Must Have ✅
- [ ] Outlet managers can add expenses
- [ ] Outlet managers can add sales
- [ ] Daily closing works with real data
- [ ] Staff can access sales entry and expenses
- [ ] Google Sheets settings can be saved
- [ ] No TypeScript errors

### Should Have 🎯
- [ ] Mobile responsive
- [ ] Proper error handling
- [ ] Loading states
- [ ] Success/error toasts
- [ ] Data validation

### Nice to Have 🌟
- [ ] Charts and graphs
- [ ] Export functionality
- [ ] Bulk operations
- [ ] Advanced filters

---

## Files to Modify

1. `components/expenses/ExpenseEntryForm.tsx` - Fix types
2. `app/(outlet)/outlet/expenses/page.tsx` - Add entry form
3. `app/(outlet)/layout.tsx` - Fix access control, add nav links
4. `components/expenses/ExpensesList.tsx` - Create new component (extract from page)
5. `app/(outlet)/outlet/settings/sheets/page.tsx` - Verify functionality

## Estimated Time
- Phase 1: 30 minutes
- Phase 2: 20 minutes  
- Phase 3: 45 minutes
- Phase 4: 30 minutes
- Phase 5: 60 minutes

**Total: ~3 hours for complete implementation**
