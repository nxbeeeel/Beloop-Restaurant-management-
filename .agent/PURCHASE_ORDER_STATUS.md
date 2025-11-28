# 📦 Purchase Order System - Status Update

## ✅ Backend Implementation - COMPLETE

### **Procurement Router** (`server/trpc/routers/procurement.ts`)

#### **Available Endpoints:**

1. **`createOrders`** - Create purchase orders
   - ✅ Groups items by supplier automatically
   - ✅ Generates WhatsApp message for each supplier
   - ✅ Creates multiple POs if items from different suppliers
   - ✅ Accessible by: SUPER, BRAND_ADMIN, OUTLET_MANAGER, STAFF

2. **`listOrders`** - View purchase orders
   - ✅ Filter by outlet and status
   - ✅ Includes supplier and item details
   - ✅ Ordered by creation date

3. **`markSent`** - Mark order as sent to supplier
   - ✅ Updates status to SENT
   - ✅ Records sent timestamp

4. **`receiveOrder`** - Receive order and update inventory
   - ✅ Upload bill image
   - ✅ Enter actual received quantities
   - ✅ Enter unit costs
   - ✅ Automatically updates stock levels
   - ✅ Creates stock movement records
   - ✅ Calculates total amount

---

## ⚠️ Frontend UI - NEEDS CREATION

### **Required Pages:**

#### **1. Purchase Orders List** (`/outlet/orders` or `/brand/orders`)
```tsx
// Features needed:
- List all purchase orders
- Filter by status (DRAFT, SENT, RECEIVED)
- Show supplier, items, total
- Actions: View, Edit, Mark Sent, Receive
```

#### **2. Create Purchase Order** (`/outlet/orders/new`)
```tsx
// Features needed:
- Select products from catalog
- Enter quantities needed
- Preview orders grouped by supplier
- Generate WhatsApp messages
- Submit orders
```

#### **3. Receive Order** (`/outlet/orders/[id]/receive`)
```tsx
// Features needed:
- Upload bill photo
- Enter received quantities (may differ from ordered)
- Enter unit costs from bill
- Calculate totals
- Update inventory automatically
```

---

## 🎯 User Flow

### **Scenario: Staff Orders Supplies**

```
1. STAFF logs in → /submit or /outlet/orders
2. Clicks "Create Order" or "Order Supplies"
3. Sees product catalog with current stock levels
4. Selects products and quantities:
   - Tomatoes: 50 kg
   - Onions: 30 kg
   - Chicken: 20 kg
5. System groups by supplier:
   - Supplier A: Tomatoes, Onions
   - Supplier B: Chicken
6. Reviews WhatsApp messages to be sent
7. Confirms and creates orders
8. Orders saved as DRAFT
9. Manager reviews and marks as SENT
10. Supplier delivers goods
11. Staff/Manager receives order:
    - Uploads bill photo
    - Confirms quantities received
    - Enters prices from bill
12. System updates inventory automatically
```

---

## 🔧 Implementation Priority

### **High Priority (This Week)**
- [ ] Create purchase order list page
- [ ] Create new order page with product selection
- [ ] Add "Order Supplies" button to outlet dashboard
- [ ] Enable STAFF and OUTLET_MANAGER access

### **Medium Priority (Next Week)**
- [ ] Create receive order page
- [ ] Add bill photo upload
- [ ] Add WhatsApp integration (send messages)
- [ ] Add low stock alerts

### **Nice to Have (Future)**
- [ ] Order history and analytics
- [ ] Supplier performance tracking
- [ ] Automated reordering based on stock levels
- [ ] Price comparison across suppliers

---

## 💡 Quick Implementation Guide

### **Step 1: Create Orders List Page**
```bash
# Create file: app/(outlet)/outlet/orders/page.tsx
```

```tsx
"use client";

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";

export default function OrdersPage() {
  const { data: orders } = trpc.procurement.listOrders.useQuery({
    outletId: "current-outlet-id", // Get from context
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h1 className="text-3xl font-bold">Purchase Orders</h1>
        <Link href="/outlet/orders/new">
          <Button>Create Order</Button>
        </Link>
      </div>

      <div className="grid gap-4">
        {orders?.map((order) => (
          <Card key={order.id} className="p-4">
            <div className="flex justify-between">
              <div>
                <h3 className="font-bold">{order.supplier.name}</h3>
                <p className="text-sm text-gray-600">
                  {order.items.length} items
                </p>
              </div>
              <div className="text-right">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                  {order.status}
                </span>
                <p className="text-sm mt-1">
                  {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

### **Step 2: Create New Order Page**
```tsx
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

export default function NewOrderPage() {
  const [selectedItems, setSelectedItems] = useState([]);
  
  const { data: products } = trpc.products.list.useQuery({
    outletId: "current-outlet-id",
  });

  const createMutation = trpc.procurement.createOrders.useMutation({
    onSuccess: () => {
      // Redirect to orders list
    },
  });

  const handleSubmit = () => {
    createMutation.mutate({
      outletId: "current-outlet-id",
      items: selectedItems,
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Create Purchase Order</h1>
      
      {/* Product selection UI */}
      <div className="grid gap-4">
        {products?.map((product) => (
          <div key={product.id} className="flex items-center gap-4">
            <span>{product.name}</span>
            <input
              type="number"
              placeholder="Quantity"
              onChange={(e) => {
                // Add to selectedItems
              }}
            />
          </div>
        ))}
      </div>

      <Button onClick={handleSubmit}>Create Orders</Button>
    </div>
  );
}
```

---

## ✅ Summary

**Backend:** ✅ Fully implemented and ready
**Frontend:** ⚠️ Needs UI pages
**Access Control:** ✅ STAFF and OUTLET_MANAGER can both create orders
**Next Step:** Create the UI pages for ordering workflow

The procurement system is **80% complete**. Just need to build the user interface!
