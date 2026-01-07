# BELOOP V2 ACTION CHECKLIST
**Critical Issues to Fix Before Production Deployment**

---

## 🔴 SPRINT 1: CRITICAL BLOCKERS (Must Complete)

### [ ] 1. PIN Entry UI Components
**Priority:** CRITICAL - Blocks all PIN functionality
**Estimated Effort:** 4-6 hours

**Files to Create:**
- [ ] `components/security/PinVerificationModal.tsx` (Main modal with backdrop)
- [ ] `components/security/PinInput.tsx` (4-digit input with auto-advance)
- [ ] `components/security/PinLockoutWarning.tsx` (Lockout alert)
- [ ] `hooks/usePinVerification.ts` (React hook for easy integration)

**Requirements:**
- 4-digit PIN input with auto-focus
- Auto-advance to next digit on input
- Backspace/arrow key navigation
- Paste support (full 4-digit PIN)
- Visual states: normal, verifying, error, success, locked
- Display lockout countdown if locked
- Show manager notification indicator
- Accessible (ARIA labels)

**Test Cases:**
- [ ] Can enter 4-digit PIN
- [ ] Auto-submits when 4th digit entered
- [ ] Shows error on invalid PIN
- [ ] Shows lockout warning after 5 failed attempts
- [ ] Countdown timer works during lockout
- [ ] Cannot submit while locked

---

### [ ] 2. PIN Enforcement Middleware
**Priority:** CRITICAL - Security breach if missing
**Estimated Effort:** 3-4 hours

**Files to Create:**
- [ ] `server/middleware/requirePin.ts` (tRPC middleware)
- [ ] `server/middleware/checkSecuritySettings.ts` (Settings enforcement)

**Files to Modify:**
- [ ] `server/trpc/routers/pos.ts` (Add PIN checks to voidOrder, editOrder)

**Implementation:**
```typescript
// Middleware example:
export const requirePin = (action: PinAction) =>
  middleware(async ({ ctx, next, input }) => {
    // 1. Check SecuritySettings for outlet
    const settings = await prisma.securitySettings.findUnique({
      where: { outletId: ctx.posCredentials.outletId }
    });

    // 2. Determine if PIN required for this action
    const requiresPIN = settings?.[`${action}RequiresPIN`];

    // 3. If required, verify PIN was provided and valid
    if (requiresPIN && !input.pin) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'PIN required' });
    }

    if (requiresPIN) {
      const verified = await verifyPin(ctx.userId, input.pin);
      if (!verified) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid PIN' });
      }
    }

    return next();
  });
```

**Operations to Protect:**
- [ ] Void order (requires manager PIN)
- [ ] Edit order (requires PIN)
- [ ] Stock adjustment (requires PIN)
- [ ] Cash withdrawal (requires PIN)
- [ ] Price override (requires PIN)
- [ ] Manual discount > threshold (requires PIN)
- [ ] Modify daily closing (requires PIN)
- [ ] Supplier payment (requires PIN)

**Test Cases:**
- [ ] Operation blocked if PIN required but not provided
- [ ] Operation blocked if PIN incorrect
- [ ] Failed attempts increment counter
- [ ] Lockout triggered after 5 failures
- [ ] Operation succeeds with correct PIN
- [ ] Action logged in PINActionLog

---

### [ ] 3. DailyRegister Router Implementation
**Priority:** HIGH - Blocks cash management feature
**Estimated Effort:** 6-8 hours

**File to Create:**
- [ ] `server/trpc/routers/dailyRegister.ts` (New router)

**Endpoints to Implement:**
```typescript
export const dailyRegisterRouter = router({
  // Open register for the day
  openRegister: protectedProcedure
    .input(z.object({
      outletId: z.string(),
      date: z.date(),
      expectedOpening: z.number(),
      actualOpening: z.number(),
      openingNote: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => { ... }),

  // Record transaction (sale, expense, etc)
  addTransaction: protectedProcedure
    .input(z.object({
      registerId: z.string(),
      type: z.enum(['SALE', 'EXPENSE', 'WITHDRAWAL', 'PAYOUT', 'MANUAL']),
      amount: z.number(),
      isInflow: z.boolean(),
      paymentMode: z.enum(['CASH', 'UPI', 'CARD', 'ONLINE']),
      description: z.string(),
      // ... other fields
    }))
    .mutation(async ({ ctx, input }) => { ... }),

  // Record cash withdrawal (requires PIN)
  recordWithdrawal: protectedProcedure
    .input(z.object({
      registerId: z.string(),
      amount: z.number(),
      purpose: z.enum(['BANK_DEPOSIT', 'OWNER_WITHDRAWAL', 'EMERGENCY', 'PETTY_CASH']),
      handedTo: z.string(),
      notes: z.string().optional(),
      pin: z.string(), // REQUIRED
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify PIN before allowing withdrawal
      // Create CashWithdrawal record
      // Update DailyRegister totals
      // Send manager notification
    }),

  // Close register (calculate variance, require PIN if > threshold)
  closeRegister: protectedProcedure
    .input(z.object({
      registerId: z.string(),
      physicalCash: z.number(),
      denominations: z.record(z.number()), // { "2000": 5, "500": 10 }
      varianceReason: z.string().optional(),
      pin: z.string().optional(), // Required if variance > threshold
    }))
    .mutation(async ({ ctx, input }) => {
      // Calculate systemCash from transactions
      // Calculate variance
      // If variance > threshold, require PIN
      // Send notification if variance significant
      // Update DailySalesRegisterV2 (aggregated data)
    }),

  // Get register for specific date
  getRegister: protectedProcedure
    .input(z.object({
      outletId: z.string(),
      date: z.date(),
    }))
    .query(async ({ ctx, input }) => { ... }),

  // Get transaction history
  getTransactions: protectedProcedure
    .input(z.object({
      registerId: z.string(),
      type: z.enum(['SALE', 'EXPENSE', 'WITHDRAWAL', 'PAYOUT', 'MANUAL']).optional(),
    }))
    .query(async ({ ctx, input }) => { ... }),

  // Get history of past registers
  getHistory: protectedProcedure
    .input(z.object({
      outletId: z.string(),
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ ctx, input }) => { ... }),
});
```

**Integration Points:**
- [ ] Add to `server/trpc/routers/_app.ts`:
  ```typescript
  import { dailyRegisterRouter } from "./dailyRegister";

  export const appRouter = router({
    // ... existing routers
    dailyRegister: dailyRegisterRouter,
  });
  ```
- [ ] Export from `server/trpc/routers/index.ts`:
  ```typescript
  export * from './dailyRegister';
  ```

**Test Cases:**
- [ ] Can open register for new day
- [ ] Cannot open register twice for same day
- [ ] Transactions update running totals
- [ ] Withdrawal requires PIN
- [ ] Closing requires PIN if variance > threshold
- [ ] Variance calculation accurate
- [ ] Manager notification sent for large variance

---

### [ ] 4. Manager Notification Integration
**Priority:** HIGH - Managers must be alerted
**Estimated Effort:** 3-4 hours

**Files to Modify:**
- [ ] `server/trpc/routers/pos.ts` (Call notifications on void/edit)
- [ ] `server/trpc/routers/dailyRegister.ts` (Call on withdrawal/variance)

**Integration Points:**
```typescript
// After successful void order:
await sendManagerNotification({
  outletId,
  type: 'VOID_ORDER',
  priority: 'HIGH',
  title: 'Order Voided',
  message: `${ctx.user.name} voided order #${order.orderNumber} - ₹${order.total}`,
  actionBy: ctx.userId,
  actionByName: ctx.user.name,
  amount: order.total,
  metadata: {
    orderId: order.id,
    reason: input.reason,
  }
});

// After cash withdrawal:
await sendManagerNotification({
  outletId,
  type: 'CASH_WITHDRAWAL',
  priority: 'CRITICAL',
  title: 'Cash Withdrawal',
  message: `${ctx.user.name} withdrew ₹${input.amount} for ${input.purpose}`,
  actionBy: ctx.userId,
  actionByName: ctx.user.name,
  amount: input.amount,
  metadata: {
    withdrawalId: withdrawal.id,
    handedTo: input.handedTo,
  }
});
```

**Notification Triggers:**
- [ ] Order voided
- [ ] Order edited
- [ ] Cash withdrawal
- [ ] Stock adjustment
- [ ] Daily closing variance > threshold
- [ ] Manual discount > threshold
- [ ] Price override
- [ ] Failed PIN attempts (5+)

---

### [ ] 5. Security Settings Enforcement
**Priority:** HIGH - Settings currently ignored
**Estimated Effort:** 2-3 hours

**Files to Modify:**
- [ ] `server/trpc/routers/pos.ts` (Check settings before operations)
- [ ] `server/trpc/routers/dailyRegister.ts` (Check withdrawal settings)

**Implementation:**
```typescript
// Helper function to check if action requires PIN
async function checkPinRequirement(
  outletId: string,
  action: keyof SecuritySettings
): Promise<boolean> {
  const settings = await prisma.securitySettings.findUnique({
    where: { outletId }
  });

  if (!settings) {
    // Default to requiring PIN if no settings found
    return true;
  }

  return settings[action] ?? true;
}

// Use in procedures:
const requiresPIN = await checkPinRequirement(outletId, 'voidOrderRequiresPIN');
if (requiresPIN && !input.pin) {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'PIN required for this operation'
  });
}
```

**Settings to Enforce:**
- [ ] `editOrderRequiresPIN`
- [ ] `voidOrderRequiresPIN`
- [ ] `withdrawalRequiresPIN`
- [ ] `priceOverrideRequiresPIN`
- [ ] `stockAdjustmentRequiresPIN`
- [ ] `refundRequiresPIN`
- [ ] `modifyClosingRequiresPIN`
- [ ] `supplierPaymentRequiresPIN`
- [ ] `manualDiscountRequiresPIN`
- [ ] `manualDiscountThreshold` (% above which PIN required)
- [ ] `varianceThreshold` (amount above which PIN required for closing)

---

## 🟡 SPRINT 2: HIGH PRIORITY

### [ ] 6. Migrate Expenses to V2
**Priority:** HIGH
**Estimated Effort:** 4-6 hours

**Files to Modify:**
- [ ] `server/trpc/routers/expenses.ts` (Replace Expense with ExpenseEntryV2)

**New Router:** `server/trpc/routers/expenseV2.ts`
```typescript
export const expenseV2Router = router({
  // Create expense category
  createCategory: protectedProcedure
    .use(requireRole(['BRAND_ADMIN', 'OUTLET_MANAGER']))
    .input(z.object({
      outletId: z.string(),
      name: z.string(),
      code: z.string(),
      icon: z.string().optional(),
      requiresProof: z.boolean().default(true),
      requiresRef: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => { ... }),

  // Record expense entry
  createExpense: protectedProcedure
    .input(z.object({
      outletId: z.string(),
      categoryId: z.string(),
      amount: z.number(),
      description: z.string(),
      vendorName: z.string().optional(),
      paymentMethod: z.enum(['CASH', 'UPI', 'CARD', 'BANK']),
      proofImageUrl: z.string().optional(),
      pin: z.string().optional(), // Required if category.requiresProof and no image
    }))
    .mutation(async ({ ctx, input }) => {
      // Validate proof if required
      // Verify PIN if sensitive
      // Create ExpenseEntryV2
      // Update DailyRegister transaction
    }),
});
```

**Migration Steps:**
- [ ] Create ExpenseCategoryV2 for existing expense types
- [ ] Migrate old Expense records to ExpenseEntryV2 (data migration script)
- [ ] Update all references from Expense to ExpenseEntryV2
- [ ] Add proof image upload to expense entry form

---

### [ ] 7. Order Edit History Auto-Tracking
**Priority:** MEDIUM
**Estimated Effort:** 2-3 hours

**Files to Modify:**
- [ ] `server/trpc/routers/pos.ts` (editOrder, voidOrder)

**Implementation:**
```typescript
// Before edit:
const previousData = {
  items: order.items,
  subTotal: order.subTotal,
  total: order.total,
  // ... capture all relevant fields
};

// Apply edit
await prisma.order.update({ ... });

// After edit:
const newData = {
  items: updatedOrder.items,
  subTotal: updatedOrder.subTotal,
  total: updatedOrder.total,
};

// Create history record
await prisma.orderEditHistory.create({
  data: {
    orderId: order.id,
    outletId: order.outletId,
    editType: 'ITEMS_MODIFIED',
    previousData,
    newData,
    previousTotal: order.total,
    newTotal: updatedOrder.total,
    difference: updatedOrder.total - order.total,
    reason: input.reason,
    editedBy: ctx.userId,
    editedByName: ctx.user.name,
    pinVerified: !!input.pin,
    managerNotified: true,
  }
});
```

---

### [ ] 8. CreditorLedger Router
**Priority:** MEDIUM
**Estimated Effort:** 4-5 hours

**File to Create:**
- [ ] `server/trpc/routers/creditorLedger.ts`

**Endpoints:**
```typescript
export const creditorLedgerRouter = router({
  // Record supplier purchase (credit entry)
  recordPurchase: protectedProcedure
    .input(z.object({
      outletId: z.string(),
      supplierId: z.string(),
      poId: z.string(),
      amount: z.number(),
      particulars: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Create credit entry (we owe supplier)
      // Update supplier balance
    }),

  // Record payment to supplier (debit entry)
  recordPayment: protectedProcedure
    .input(z.object({
      outletId: z.string(),
      supplierId: z.string(),
      amount: z.number(),
      paymentMethod: z.enum(['CASH', 'UPI', 'BANK', 'CHEQUE']),
      notes: z.string().optional(),
      pin: z.string(), // REQUIRED
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify PIN
      // Create debit entry (paid supplier)
      // Update supplier balance
      // Create CashWithdrawal if CASH payment
      // Send manager notification
    }),

  // Get ledger for supplier
  getLedger: protectedProcedure
    .input(z.object({
      supplierId: z.string(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ ctx, input }) => { ... }),
});
```

---

## 🟢 SPRINT 3: CODE QUALITY

### [ ] 9. Fix Cascade Delete Risks
**Priority:** LOW
**Estimated Effort:** 1 hour

**File to Modify:**
- [ ] `prisma/schema.prisma`

**Changes:**
```prisma
// Audit tables should use Restrict, not Cascade
model RegisterTransaction {
  register DailyRegister @relation(..., onDelete: Restrict) // Was: Cascade
}

model CashWithdrawal {
  register DailyRegister @relation(..., onDelete: Restrict) // Was: Cascade
}

model OrderEditHistory {
  order Order @relation(..., onDelete: Restrict) // Was: Cascade
}

model PINActionLog {
  // Already no relation, no change needed
}

model CreditorLedger {
  supplier Supplier @relation(..., onDelete: Restrict) // Was: Cascade
}
```

**After changes:**
- [ ] Run `npx prisma format`
- [ ] Run `npx prisma migrate dev --name fix-cascade-deletes`
- [ ] Test that delete operations fail when audit records exist

---

### [ ] 10. Add Missing Database Indexes
**Priority:** LOW
**Estimated Effort:** 30 minutes

**File to Modify:**
- [ ] `prisma/schema.prisma`

**Changes:**
```prisma
model PINActionLog {
  // Existing indexes
  @@index([outletId, createdAt])
  @@index([action, createdAt])
  @@index([userId])

  // NEW: For filtering failed attempts
  @@index([status, createdAt])
  @@index([userId, status])
}

model ManagerNotification {
  // Existing indexes
  @@index([managerId, isRead])
  @@index([outletId, createdAt])

  // NEW: For sorting notifications by time
  @@index([managerId, isRead, createdAt])
  @@index([outletId, isRead, createdAt])
}

model RegisterTransaction {
  @@index([registerId])
  @@index([outletId, createdAt])
  @@index([type, createdAt])

  // NEW: For filtering by payment mode
  @@index([registerId, paymentMode])
}
```

---

### [ ] 11. Fix Invalid Default Values
**Priority:** LOW
**Estimated Effort:** 15 minutes

**File to Modify:**
- [ ] `prisma/schema.prisma`

**Changes:**
```prisma
model OrderEditHistory {
  pinVerified Boolean @default(false) // Was: true
}

model ManagerNotification {
  sentVia String[] @default(["IN_APP"]) // Was: ["IN_APP", "WHATSAPP"]
}

model ExpenseEntryV2 {
  pinVerified Boolean @default(false) // Was: false (correct, no change)
}
```

---

### [ ] 12. Consolidate Cash Management Systems
**Priority:** LOW
**Estimated Effort:** 4-6 hours (if removing Velocity)

**Decision Required:** Keep **DailyRegister V2** or **VelocityRegister**?

**Recommendation:** Keep `DailyRegister` (more comprehensive)

**If removing Velocity:**
- [ ] Delete Velocity models from schema:
  - VelocityRegister
  - VelocityTransaction
  - VelocityCategory
  - VelocityWallet
  - VelocityTransfer
- [ ] Remove Velocity router
- [ ] Update POS router to use DailyRegister
- [ ] Migrate existing Velocity data to DailyRegister (data migration)
- [ ] Remove Velocity UI components

---

## Testing Checklist

### Unit Tests
- [ ] PIN verification logic
- [ ] Lockout mechanism
- [ ] Security settings enforcement
- [ ] Audit log creation

### Integration Tests
- [ ] End-to-end PIN flow (entry → verification → success)
- [ ] Lockout after 5 failed attempts
- [ ] Manager notifications sent correctly
- [ ] Transaction totals calculated accurately
- [ ] Variance calculation correct

### UI/UX Tests
- [ ] PIN modal opens on protected action
- [ ] PIN input auto-advances
- [ ] Error messages clear
- [ ] Lockout warning displays countdown
- [ ] Success state shows briefly

### Security Tests
- [ ] Cannot bypass PIN requirement via API
- [ ] Cannot brute-force PIN (rate limiting)
- [ ] Audit logs immutable
- [ ] Manager notifications cannot be suppressed

---

## Deployment Checklist

### Pre-Deployment
- [ ] All SPRINT 1 tasks complete
- [ ] Database migrations tested on staging
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Security audit passed
- [ ] Performance testing done
- [ ] User acceptance testing complete

### Deployment Steps
1. [ ] Backup production database
2. [ ] Run database migrations
3. [ ] Deploy backend API
4. [ ] Deploy frontend build
5. [ ] Verify critical flows working
6. [ ] Monitor error logs for 24 hours
7. [ ] Train outlet managers on PIN features

### Post-Deployment Monitoring
- [ ] PIN verification success rate > 95%
- [ ] Manager notifications delivering
- [ ] Audit logs populating
- [ ] No increase in error rates
- [ ] Response times < 200ms

---

## Notes

- **DO NOT** deploy to production until ALL Sprint 1 tasks are complete
- **DO NOT** merge incomplete features to main branch
- **ALWAYS** test PIN flows on staging first
- **BACKUP** database before running migrations
- **DOCUMENT** any deviations from this plan

---

**Last Updated:** 2026-01-07
**Status:** ⚠️ V2 BLOCKED - Critical fixes required
**Next Review:** After Sprint 1 completion
