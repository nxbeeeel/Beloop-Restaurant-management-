# 🔧 Connection Issue & Invitation Management - Quick Fix Guide

## 🚨 **Connection Refused Error - Solutions**

### **Issue:** `ERR_CONNECTION_REFUSED` when accessing localhost

### **Quick Fixes:**

#### **1. Verify Dev Server is Running**
The dev server IS running on port 3000. Check the terminal output shows:
```
✓ Ready in 6s
- Local: http://localhost:3000
```

#### **2. Try These URLs:**
- `http://localhost:3000`
- `http://127.0.0.1:3000`
- `http://[::1]:3000` (IPv6)

#### **3. Clear Browser Cache**
1. Press `Ctrl + Shift + Delete` (or `Cmd + Shift + Delete` on Mac)
2. Clear cached images and files
3. Restart browser

#### **4. Check Firewall/Antivirus**
- Temporarily disable firewall
- Add exception for Node.js
- Allow port 3000

#### **5. Restart Dev Server**
```bash
# Stop current server (Ctrl+C)
# Then restart:
npm run dev
```

#### **6. Check Port Availability**
```bash
# Windows
netstat -ano | findstr :3000

# If port is in use, kill the process or use different port
# In package.json, change to:
"dev": "next dev -p 3001"
```

#### **7. Try Different Browser**
- Chrome
- Firefox
- Edge
- Incognito/Private mode

---

## ✅ **Invitation Management Feature - COMPLETE**

### **What Was Added:**

#### **1. Server Actions** (`server/actions/invitation.ts`)
- ✅ `cancelInvitation(id)` - Cancel/revoke pending invitations
- ✅ `resendInvitation(id)` - Extend expiration by 7 days

#### **2. Management UI** (`/brand/invitations`)
- ✅ View all invitations (pending, accepted, expired, cancelled)
- ✅ Copy invitation link to clipboard
- ✅ Extend invitation expiration
- ✅ Cancel pending invitations
- ✅ See invitation status with color-coded badges
- ✅ Filter by status

#### **3. Features:**
- **Copy Link** - One-click copy invitation URL
- **Extend** - Add 7 more days to expiration
- **Cancel** - Revoke invitation (status → REVOKED)
- **Status Badges** - Visual indicators:
  - 🟡 Pending
  - 🟢 Accepted
  - ⚫ Expired
  - 🔴 Cancelled

---

## 📍 **How to Access Invitation Management**

### **As BRAND_ADMIN:**

1. **Navigate to:** `http://localhost:3000/brand/invitations`
2. **Or add link to navigation** (recommended)

### **Add to Navigation Menu:**

Edit: `app/(brand)/brand/layout.tsx`

```tsx
const navigation = [
  { name: 'Dashboard', href: '/brand/dashboard', icon: Home },
  { name: 'Outlets', href: '/brand/outlets', icon: Store },
  { name: 'Staff', href: '/brand/staff', icon: Users },
  { name: 'Invitations', href: '/brand/invitations', icon: Mail }, // ADD THIS
  { name: 'Suppliers', href: '/brand/suppliers', icon: Package },
  // ... rest
];
```

---

## 🎯 **Testing the Invitation Management**

### **Step 1: Create Test Invitation**
1. Go to `/brand/staff`
2. Click "Invite Staff"
3. Fill in email and role
4. Submit

### **Step 2: View Invitations**
1. Go to `/brand/invitations`
2. See the invitation in the list
3. Status should be "Pending"

### **Step 3: Test Actions**

#### **Copy Link:**
1. Click "Copy Link" button
2. Paste in new browser tab
3. Should see invitation page

#### **Extend Expiration:**
1. Click "Extend" button
2. Expiration date extended by 7 days
3. Toast notification confirms

#### **Cancel Invitation:**
1. Click "Cancel" button
2. Confirm in dialog
3. Status changes to "Cancelled"
4. Invitation link no longer works

---

## 🔗 **Complete Invitation Workflow**

```
1. BRAND_ADMIN creates invitation
   ↓
2. Goes to /brand/invitations
   ↓
3. Sees invitation in list (Status: Pending)
   ↓
4. Options:
   - Copy Link → Share with invitee
   - Extend → Add 7 more days
   - Cancel → Revoke invitation
   ↓
5. Invitee clicks link
   ↓
6. Accepts invitation
   ↓
7. Status changes to "Accepted"
   ↓
8. BRAND_ADMIN sees updated status
```

---

## 🐛 **Troubleshooting**

### **Issue: Can't access /brand/invitations**
**Solution:** Make sure you're logged in as BRAND_ADMIN

### **Issue: Invitations not showing**
**Solution:** Check database - invitations should have matching tenantId

### **Issue: Cancel button not working**
**Solution:** Check browser console for errors, verify permissions

### **Issue: Copy link doesn't work**
**Solution:** Browser might block clipboard access - check permissions

---

## 📊 **Current Status**

### **✅ Complete:**
- Invitation creation
- Invitation acceptance
- Invitation management UI
- Cancel functionality
- Resend/extend functionality
- Copy link to clipboard
- Status tracking

### **📝 Future Enhancements:**
- Email notifications (requires email service)
- Bulk actions (cancel multiple)
- Search/filter invitations
- Export invitation list
- Invitation analytics

---

## 🚀 **Quick Start**

1. **Start dev server:** `npm run dev`
2. **Access:** `http://localhost:3000`
3. **Login as BRAND_ADMIN**
4. **Go to:** `/brand/invitations`
5. **Manage invitations!**

---

## 💡 **Pro Tips**

1. **Add to Navigation** - Make it easy to find
2. **Regular Cleanup** - Cancel expired invitations
3. **Copy Link** - Easier than email for testing
4. **Extend Wisely** - Don't extend too many times
5. **Monitor Status** - Check acceptance rate

---

**Status:** Invitation management system is fully functional! 🎉

**Next:** Add link to navigation menu for easy access.
