import { router, protectedProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { sendToGoogleSheets } from "@/lib/appsScript";

export const googleSheetsRouter = router({
  // Save Apps Script URL for an outlet
  saveAppsScriptUrl: protectedProcedure
    .input(z.object({
      outletId: z.string(),
      appsScriptUrl: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { outletId, appsScriptUrl } = input;

      // Verify user has access to this outlet
      const outlet = await ctx.prisma.outlet.findUnique({
        where: { id: outletId },
        select: { tenantId: true }
      });

      if (!outlet || outlet.tenantId !== ctx.tenantId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Update outlet with Apps Script URL
      await ctx.prisma.outlet.update({
        where: { id: outletId },
        data: { googleSheetsUrl: appsScriptUrl }
      });

      return { success: true };
    }),

  // Get Apps Script URL for an outlet
  getAppsScriptUrl: protectedProcedure
    .input(z.object({
      outletId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const outlet = await ctx.prisma.outlet.findUnique({
        where: { id: input.outletId },
        select: { tenantId: true, googleSheetsUrl: true }
      });

      if (!outlet || outlet.tenantId !== ctx.tenantId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return { appsScriptUrl: outlet.googleSheetsUrl };
    }),

  // Export monthly report to Google Sheets via Apps Script
  exportMonthlyReport: protectedProcedure
    .input(z.object({
      outletId: z.string(),
      year: z.number(),
      month: z.number().min(1).max(12),
    }))
    .mutation(async ({ ctx, input }) => {
      const { outletId, year, month } = input;

      // Get outlet with Apps Script URL
      const outlet = await ctx.prisma.outlet.findUnique({
        where: { id: outletId },
        select: {
          tenantId: true,
          name: true,
          googleSheetsUrl: true
        }
      });

      if (!outlet || outlet.tenantId !== ctx.tenantId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      if (!outlet.googleSheetsUrl) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Google Sheets Apps Script URL not configured for this outlet"
        });
      }

      // Fetch sales data
      const sales = await ctx.prisma.sale.findMany({
        where: {
          outletId,
          date: {
            gte: new Date(year, month - 1, 1),
            lt: new Date(year, month, 1),
          }
        },
        include: {
          staff: {
            select: { name: true }
          }
        },
        orderBy: { date: 'asc' }
      });

      // Fetch expenses data
      const expenses = await ctx.prisma.expense.findMany({
        where: {
          outletId,
          date: {
            gte: new Date(year, month - 1, 1),
            lt: new Date(year, month, 1),
          }
        },
        include: {
          staff: {
            select: { name: true }
          }
        },
        orderBy: { date: 'asc' }
      });

      // Transform data
      const salesData = sales.map(sale => ({
        date: sale.date.toISOString().split('T')[0],
        cashSale: Number(sale.cashSale),
        bankSale: Number(sale.bankSale),
        swiggy: Number(sale.swiggy),
        zomato: Number(sale.zomato),
        totalSale: Number(sale.totalSale),
        submittedBy: sale.staff.name,
      }));

      const expensesData = expenses.map(expense => ({
        date: expense.date.toISOString().split('T')[0],
        category: expense.category,
        amount: Number(expense.amount),
        description: expense.description || '',
        submittedBy: expense.staff.name,
      }));

      // Send to Google Sheets via Apps Script
      const result = await sendToGoogleSheets(outlet.googleSheetsUrl, {
        type: 'both',
        outletName: outlet.name,
        month,
        year,
        sales: salesData,
        expenses: expensesData,
      });

      return {
        success: result.success,
        spreadsheetUrl: result.spreadsheetUrl,
        spreadsheetId: result.spreadsheetId,
        salesCount: sales.length,
        expensesCount: expenses.length,
      };
    }),

  // Generate customized Apps Script code for an outlet
  generateScript: protectedProcedure
    .input(z.object({
      outletId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const outlet = await ctx.prisma.outlet.findUnique({
        where: { id: input.outletId },
        select: {
          id: true,
          name: true,
          code: true,
          tenantId: true,
          tenant: {
            select: {
              expenseCategories: true
            }
          }
        }
      });

      if (!outlet || outlet.tenantId !== ctx.tenantId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const categories = outlet.tenant.expenseCategories || [];
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://beloop-restaurant-management.vercel.app';

      // Fetch products for this outlet
      const products = await ctx.prisma.product.findMany({
        where: { outletId: input.outletId },
        select: { name: true }
      });
      const productNames = products.map(p => p.name);

      // Generate the Apps Script code
      const scriptCode = `// ============================================
// Beloop Google Sheets Integration Script
// Outlet: ${outlet.name} (${outlet.code})
// Generated: ${new Date().toISOString()}
// ============================================

// CONFIGURATION
const OUTLET_ID = "${outlet.id}";
const API_URL = "${appUrl}/api/sheets";
const AUTH_TOKEN = "YOUR_AUTH_TOKEN_HERE"; // Get this from Beloop settings

// EXPENSE CATEGORIES
const EXPENSE_CATEGORIES = ${JSON.stringify(categories, null, 2)};

// PRODUCTS (for inventory tracking)
const PRODUCTS = ${JSON.stringify(productNames, null, 2)};

// ============================================
// SHEET SETUP
// ============================================

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Beloop Sync')
    .addItem('Push Sales to Beloop', 'pushSalesToBeloop')
    .addItem('Push Expenses to Beloop', 'pushExpensesToBeloop')
    .addItem('Setup Sheets', 'setupSheets')
    .addItem('Generate Month End Ledger', 'generateMonthEndLedger')
    .addToUi();
}

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // ===== SALES SHEET =====
  let salesSheet = ss.getSheetByName('Daily Sales');
  if (!salesSheet) {
    salesSheet = ss.insertSheet('Daily Sales');
    
    // Add opening balance section
    salesSheet.getRange('A1:B1').merge().setValue('OPENING BALANCE (From Last Month)').setFontWeight('bold').setBackground('#FBBC04').setFontColor('#000000');
    salesSheet.getRange('A2').setValue('Last Month Net Profit/Loss:');
    salesSheet.getRange('B2').setValue(0).setNumberFormat('₹#,##0.00').setFontWeight('bold');
    salesSheet.getRange('A3').setValue('Notes:');
    salesSheet.getRange('B3').setValue('Update this manually from last month ledger');
    
    // Add spacing
    salesSheet.getRange('A4').setValue('');
    
    // Add headers for daily sales
    salesSheet.getRange('A5:I5').setValues([[
      'Date', 'Cash Sale', 'Bank Sale', 'Swiggy', 'Zomato', 
      'Other Online', 'Total', 'Notes', 'Status'
    ]]);
    salesSheet.getRange('A5:I5').setFontWeight('bold').setBackground('#4285F4').setFontColor('#FFFFFF');
    salesSheet.setFrozenRows(5);
    
    // Add formula for Total column (starting from row 6)
    salesSheet.getRange('G6').setFormula('=SUM(B6:F6)');
  }
  
  // ===== EXPENSES SHEET =====
  let expensesSheet = ss.getSheetByName('Daily Expenses');
  if (!expensesSheet) {
    expensesSheet = ss.insertSheet('Daily Expenses');
    const headers = ['Date', 'Category', 'Product', 'Amount', 'Description', 'Status'];
    expensesSheet.getRange('A1:F1').setValues([headers]);
    expensesSheet.getRange('A1:F1').setFontWeight('bold').setBackground('#EA4335').setFontColor('#FFFFFF');
    expensesSheet.setFrozenRows(1);
    
    // Add data validation for categories
    const categoryRange = expensesSheet.getRange('B2:B1000');
    const categoryRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(EXPENSE_CATEGORIES, true)
      .build();
    categoryRange.setDataValidation(categoryRule);
    
    // Add data validation for products
    if (PRODUCTS.length > 0) {
      const productRange = expensesSheet.getRange('C2:C1000');
      const productRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(PRODUCTS, true)
        .setAllowInvalid(true)
        .build();
      productRange.setDataValidation(productRule);
    }
  }
  
  // ===== INVENTORY SHEET =====
  let inventorySheet = ss.getSheetByName('Inventory');
  if (!inventorySheet) {
    inventorySheet = ss.insertSheet('Inventory');
    const headers = ['Date', 'Product', 'Opening Stock', 'Purchase', 'Sales', 'Wastage', 'Closing Stock', 'Unit', 'Notes'];
    inventorySheet.getRange('A1:I1').setValues([headers]);
    inventorySheet.getRange('A1:I1').setFontWeight('bold').setBackground('#34A853').setFontColor('#FFFFFF');
    inventorySheet.setFrozenRows(1);
    
    // Add data validation for products
    if (PRODUCTS.length > 0) {
      const productRange = inventorySheet.getRange('B2:B1000');
      const productRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(PRODUCTS, true)
        .build();
      productRange.setDataValidation(productRule);
    }
    
    // Add formula for Closing Stock (Opening + Purchase - Sales - Wastage)
    inventorySheet.getRange('G2').setFormula('=C2+D2-E2-F2');
  }
  
  SpreadsheetApp.getUi().alert('All sheets setup complete!\\n\\n✓ Daily Sales\\n✓ Daily Expenses\\n✓ Inventory');
}

// ============================================
// MONTH END LEDGER
// ============================================

function generateMonthEndLedger() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const salesSheet = ss.getSheetByName('Daily Sales');
  const expensesSheet = ss.getSheetByName('Daily Expenses');
  
  if (!salesSheet || !expensesSheet) {
    SpreadsheetApp.getUi().alert('Please run Setup Sheets first!');
    return;
  }
  
  // Get current month
  const today = new Date();
  const month = Utilities.formatDate(today, Session.getScriptTimeZone(), 'MMMM yyyy');
  
  // Calculate totals from sales
  const salesData = salesSheet.getDataRange().getValues();
  let totalCash = 0, totalBank = 0, totalSwiggy = 0, totalZomato = 0, totalOther = 0;
  
  for (let i = 1; i < salesData.length; i++) {
    if (salesData[i][0]) { // Has date
      totalCash += Number(salesData[i][1]) || 0;
      totalBank += Number(salesData[i][2]) || 0;
      totalSwiggy += Number(salesData[i][3]) || 0;
      totalZomato += Number(salesData[i][4]) || 0;
      totalOther += Number(salesData[i][5]) || 0;
    }
  }
  
  const totalSales = totalCash + totalBank + totalSwiggy + totalZomato + totalOther;
  
  // Calculate totals from expenses
  const expensesData = expensesSheet.getDataRange().getValues();
  let totalExpenses = 0;
  const expensesByCategory = {};
  
  for (let i = 1; i < expensesData.length; i++) {
    if (expensesData[i][0]) { // Has date
      const amount = Number(expensesData[i][3]) || 0;
      const category = expensesData[i][1];
      totalExpenses += amount;
      
      if (category) {
        expensesByCategory[category] = (expensesByCategory[category] || 0) + amount;
      }
    }
  }
  
  // Create or get ledger sheet
  let ledgerSheet = ss.getSheetByName('Month End Ledger');
  if (!ledgerSheet) {
    ledgerSheet = ss.insertSheet('Month End Ledger');
  }
  ledgerSheet.clear();
  
  // Write ledger
  let row = 1;
  ledgerSheet.getRange(row, 1, 1, 2).setValues([['MONTH END LEDGER', month]]);
  ledgerSheet.getRange(row, 1, 1, 2).setFontWeight('bold').setFontSize(14);
  row += 2;
  
  // Sales Summary
  ledgerSheet.getRange(row, 1).setValue('SALES SUMMARY').setFontWeight('bold').setBackground('#4285F4').setFontColor('#FFFFFF');
  row++;
  ledgerSheet.getRange(row, 1, 5, 2).setValues([
    ['Cash Sales', totalCash],
    ['Bank Sales', totalBank],
    ['Swiggy', totalSwiggy],
    ['Zomato', totalZomato],
    ['Other Online', totalOther]
  ]);
  row += 5;
  ledgerSheet.getRange(row, 1, 1, 2).setValues([['TOTAL SALES', totalSales]]).setFontWeight('bold');
  row += 2;
  
  // Expenses Summary
  ledgerSheet.getRange(row, 1).setValue('EXPENSES SUMMARY').setFontWeight('bold').setBackground('#EA4335').setFontColor('#FFFFFF');
  row++;
  Object.keys(expensesByCategory).forEach(category => {
    ledgerSheet.getRange(row, 1, 1, 2).setValues([[category, expensesByCategory[category]]]);
    row++;
  });
  ledgerSheet.getRange(row, 1, 1, 2).setValues([['TOTAL EXPENSES', totalExpenses]]).setFontWeight('bold');
  row += 2;
  
  // Net Profit
  const netProfit = totalSales - totalExpenses;
  ledgerSheet.getRange(row, 1, 1, 2).setValues([['NET PROFIT', netProfit]])
    .setFontWeight('bold')
    .setFontSize(12)
    .setBackground(netProfit >= 0 ? '#34A853' : '#EA4335')
    .setFontColor('#FFFFFF');
  
  // Format currency columns
  ledgerSheet.getRange(4, 2, row - 3, 1).setNumberFormat('₹#,##0.00');
  
  SpreadsheetApp.getUi().alert('Month End Ledger generated successfully!');
}

// ============================================
// SYNC FUNCTIONS
// ============================================

function pushSalesToBeloop() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Daily Sales');
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Daily Sales sheet not found. Run Setup Sheets first.');
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  // Skip first 5 rows (opening balance section + headers)
  const rows = data.slice(5);
  
  const sales = rows
    .filter(row => row[0] && row[8] !== 'Synced') // Has date and not synced
    .map((row, index) => ({
      rowIndex: index + 6, // Data starts at row 6
      date: Utilities.formatDate(new Date(row[0]), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
      cashSale: Number(row[1]) || 0,
      bankSale: Number(row[2]) || 0,
      swiggy: Number(row[3]) || 0,
      zomato: Number(row[4]) || 0,
      otherOnline: Number(row[5]) || 0,
      notes: row[7] || ''
    }));
  
  if (sales.length === 0) {
    SpreadsheetApp.getUi().alert('No new sales to sync.');
    return;
  }
  
  // Send to API
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + AUTH_TOKEN
    },
    payload: JSON.stringify({
      outletId: OUTLET_ID,
      type: 'sales',
      data: sales
    })
  };
  
  try {
    const response = UrlFetchApp.fetch(API_URL, options);
    const result = JSON.parse(response.getContentText());
    
    if (result.success) {
      sales.forEach(sale => {
        sheet.getRange(sale.rowIndex, 9).setValue('Synced');
      });
      SpreadsheetApp.getUi().alert(\`Successfully synced \${sales.length} sales records!\`);
    } else {
      SpreadsheetApp.getUi().alert('Sync failed: ' + result.message);
    }
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}

function pushExpensesToBeloop() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Daily Expenses');
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Daily Expenses sheet not found. Run Setup Sheets first.');
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  const rows = data.slice(1);
  
  const expenses = rows
    .filter(row => row[0] && row[5] !== 'Synced') // Has date and not synced
    .map((row, index) => ({
      rowIndex: index + 2,
      date: Utilities.formatDate(new Date(row[0]), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
      category: row[1],
      product: row[2] || '',
      amount: Number(row[3]) || 0,
      description: row[4] || ''
    }));
  
  if (expenses.length === 0) {
    SpreadsheetApp.getUi().alert('No new expenses to sync.');
    return;
  }
  
  // Send to API
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + AUTH_TOKEN
    },
    payload: JSON.stringify({
      outletId: OUTLET_ID,
      type: 'expenses',
      data: expenses
    })
  };
  
  try {
    const response = UrlFetchApp.fetch(API_URL, options);
    const result = JSON.parse(response.getContentText());
    
    if (result.success) {
      expenses.forEach(expense => {
        sheet.getRange(expense.rowIndex, 6).setValue('Synced');
      });
      SpreadsheetApp.getUi().alert(\`Successfully synced \${expenses.length} expense records!\`);
    } else {
      SpreadsheetApp.getUi().alert('Sync failed: ' + result.message);
    }
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}`;

      return {
        outletId: outlet.id,
        outletName: outlet.name,
        outletCode: outlet.code,
        scriptCode,
        expenseCategories: categories as string[]
      };
    }),
});
