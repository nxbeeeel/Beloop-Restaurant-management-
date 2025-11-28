import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

export const tenantRouter = router({
  // Get tenant settings (expense categories, etc.)
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    const { tenantId } = ctx;

    if (!tenantId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'No tenant found',
      });
    }

    const tenant = await ctx.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        primaryColor: true,
        expenseCategories: true,
        fruitCategories: true,
      },
    });

    if (!tenant) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Tenant not found',
      });
    }

    return {
      ...tenant,
      expenseCategories: (tenant.expenseCategories as string[]) || [
        'Rent',
        'Staff Salary',
        'Bake',
        'Fruits',
        'Packaging',
        'Fuel',
        'Utilities',
        'Marketing',
        'Maintenance',
        'Other',
      ],
      fruitCategories: (tenant.fruitCategories as string[]) || [
        'Kiwi',
        'Strawberry',
        'Mango',
        'Banana',
        'Apple',
      ],
    };
  }),

  // Update tenant settings
  updateSettings: protectedProcedure
    .input(
      z.object({
        expenseCategories: z.array(z.string()).optional(),
        fruitCategories: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { tenantId, role } = ctx;

      if (!tenantId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'No tenant found',
        });
      }

      // Allow BRAND_ADMIN, SUPER, and OUTLET_MANAGER to update settings
      if (role !== 'BRAND_ADMIN' && role !== 'SUPER' && role !== 'OUTLET_MANAGER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions to update settings',
        });
      }

      const updated = await ctx.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          expenseCategories: input.expenseCategories,
          fruitCategories: input.fruitCategories,
        },
        select: {
          id: true,
          expenseCategories: true,
          fruitCategories: true,
        },
      });

      return updated;
    }),

  // Generate custom Apps Script based on tenant settings
  generateAppsScript: protectedProcedure.query(async ({ ctx }) => {
    const { tenantId } = ctx;

    if (!tenantId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'No tenant found',
      });
    }

    const tenant = await ctx.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        name: true,
        expenseCategories: true,
        fruitCategories: true,
      },
    });

    if (!tenant) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Tenant not found',
      });
    }

    const expenseCategories = (tenant.expenseCategories as string[]) || [
      'Rent',
      'Staff Salary',
      'Bake',
      'Fruits',
      'Packaging',
      'Fuel',
      'Utilities',
      'Marketing',
      'Maintenance',
      'Other',
    ];

    const fruitCategories = (tenant.fruitCategories as string[]) || [
      'Kiwi',
      'Strawberry',
      'Mango',
      'Banana',
      'Apple',
    ];

    // Generate the Apps Script content
    const script = generateAppsScriptContent(
      tenant.name,
      expenseCategories,
      fruitCategories
    );

    return {
      script,
      filename: `beloop-${tenant.name.toLowerCase().replace(/\s+/g, '-')}.gs`,
    };
  }),
});

// Helper function to generate Apps Script content
function generateAppsScriptContent(
  brandName: string,
  expenseCategories: string[],
  fruitCategories: string[]
): string {
  return `/**
 * ============================================
 * ${brandName.toUpperCase()} - GOOGLE SHEETS INTEGRATION
 * ============================================
 * 
 * Auto-generated Apps Script for ${brandName}
 * Handles: Sales, Expenses, Inventory
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a new Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Replace all code with this script
 * 4. Update SPREADSHEET_ID below
 * 5. Deploy as Web App:
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Copy the Web App URL to Beloop Settings
 * 
 * ============================================
 */

// ============================================
// CONFIGURATION
// ============================================

const SPREADSHEET_ID = "YOUR_SPREADSHEET_ID_HERE";

// Custom Expense Categories for ${brandName}
const EXPENSE_CATEGORIES = ${JSON.stringify(expenseCategories, null, 2)};

// Custom Fruit Categories for ${brandName}
const FRUIT_CATEGORIES = ${JSON.stringify(fruitCategories, null, 2)};

// ============================================
// HELPER FUNCTIONS
// ============================================

function getOrCreateSheet(sheetName, headers) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#4285f4')
        .setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }
  }
  
  return sheet;
}

function formatCurrency(value) {
  return typeof value === 'number' ? value.toFixed(2) : value;
}

function formatDate(dateString) {
  try {
    return new Date(dateString).toLocaleDateString('en-US');
  } catch (e) {
    return dateString;
  }
}

// ============================================
// 1. SALES SHEET
// ============================================

function appendSales(sales) {
  const headers = [
    'Date',
    'Outlet',
    'Cash Sale',
    'Bank Sale',
    'Swiggy',
    'Zomato',
    'Swiggy Payout',
    'Zomato Payout',
    'Other Online',
    'Other Online Payout',
    'Total Sale',
    'Cash In Hand',
    'Cash In Bank',
    'Cash Withdrawal',
    'Total Expense',
    'Profit',
    'Difference',
    'Staff',
    'Timestamp'
  ];
  
  const sheet = getOrCreateSheet('Sales', headers);
  
  sales.forEach(sale => {
    sheet.appendRow([
      formatDate(sale.date),
      sale.outletName || '',
      formatCurrency(sale.cashSale),
      formatCurrency(sale.bankSale),
      formatCurrency(sale.swiggy),
      formatCurrency(sale.zomato),
      formatCurrency(sale.swiggyPayout),
      formatCurrency(sale.zomatoPayout),
      formatCurrency(sale.otherOnline),
      formatCurrency(sale.otherOnlinePayout),
      formatCurrency(sale.totalSale),
      formatCurrency(sale.cashInHand),
      formatCurrency(sale.cashInBank),
      formatCurrency(sale.cashWithdrawal),
      formatCurrency(sale.totalExpense),
      formatCurrency(sale.profit),
      formatCurrency(sale.difference),
      sale.staffName || '',
      new Date().toLocaleString()
    ]);
  });
}

// ============================================
// 2. EXPENSES SHEET
// ============================================

function appendExpenses(expenses) {
  const headers = [
    'Date',
    'Outlet',
    'Category',
    'Amount',
    'Payment Method',
    'Description',
    'Staff',
    'Timestamp'
  ];
  
  const sheet = getOrCreateSheet('Expenses', headers);
  
  expenses.forEach(expense => {
    sheet.appendRow([
      formatDate(expense.date),
      expense.outletName || '',
      expense.category,
      formatCurrency(expense.amount),
      expense.paymentMethod,
      expense.description || '',
      expense.staffName || '',
      new Date().toLocaleString()
    ]);
  });
}

// ============================================
// 3. INVENTORY SHEET
// ============================================

function updateInventory(products) {
  const headers = [
    'Product Name',
    'Category',
    'Current Stock',
    'Unit',
    'Min Stock',
    'Supplier',
    'Last Updated'
  ];
  
  const sheet = getOrCreateSheet('Inventory', headers);
  
  // Clear existing data (keep header)
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).clear();
  }
  
  // Add current inventory
  products.forEach(product => {
    sheet.appendRow([
      product.name,
      product.category || '',
      product.currentStock,
      product.unit,
      product.minStock || 0,
      product.supplierName || '',
      new Date().toLocaleString()
    ]);
  });
}

// ============================================
// HTTP ENDPOINT - MAIN ENTRY POINT
// ============================================

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    
    Logger.log('Received action: ' + action);
    
    switch (action) {
      case 'sales':
        appendSales(payload.data);
        break;
        
      case 'expenses':
        appendExpenses(payload.data);
        break;
        
      case 'inventory':
        updateInventory(payload.data);
        break;
        
      default:
        throw new Error('Unknown action: ' + action);
    }
    
    return ContentService.createTextOutput(
      JSON.stringify({ 
        success: true, 
        action: action,
        timestamp: new Date().toISOString()
      })
    ).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    Logger.log('Error: ' + err.toString());
    
    return ContentService.createTextOutput(
      JSON.stringify({ 
        success: false, 
        error: err.toString(),
        timestamp: new Date().toISOString()
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================
// TEST FUNCTION
// ============================================

function testSales() {
  const testData = {
    action: 'sales',
    data: [{
      date: '2024-11-25',
      outletName: 'Test Outlet',
      cashSale: 5000,
      bankSale: 3000,
      swiggy: 1500,
      zomato: 1000,
      swiggyPayout: 1350,
      zomatoPayout: 900,
      otherOnline: 500,
      otherOnlinePayout: 450,
      totalSale: 10500,
      cashInHand: 4500,
      cashInBank: 3200,
      cashWithdrawal: 1000,
      totalExpense: 3500,
      profit: 7000,
      difference: 0,
      staffName: 'Test Manager'
    }]
  };
  
  const mockEvent = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };
  
  const result = doPost(mockEvent);
  Logger.log(result.getContent());
}
`;
}
