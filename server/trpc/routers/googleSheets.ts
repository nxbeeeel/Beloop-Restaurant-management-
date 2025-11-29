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

// ============================================
// SHEET SETUP
// ============================================

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Beloop Sync')
    .addItem('Push Sales to Beloop', 'pushSalesToBeloop')
    .addItem('Push Expenses to Beloop', 'pushExpensesToBeloop')
    .addItem('Setup Sheets', 'setupSheets')
    .addToUi();
}

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Create Sales Sheet
  let salesSheet = ss.getSheetByName('Sales');
  if (!salesSheet) {
    salesSheet = ss.insertSheet('Sales');
    salesSheet.getRange('A1:H1').setValues([[
      'Date', 'Cash Sale', 'Bank Sale', 'Swiggy', 'Zomato', 
      'Other Online', 'Total', 'Status'
    ]]);
    salesSheet.getRange('A1:H1').setFontWeight('bold');
    salesSheet.setFrozenRows(1);
  }
  
  // Create Expenses Sheet
  let expensesSheet = ss.getSheetByName('Expenses');
  if (!expensesSheet) {
    expensesSheet = ss.insertSheet('Expenses');
    const headers = ['Date', 'Category', 'Amount', 'Description', 'Status'];
    expensesSheet.getRange('A1:E1').setValues([headers]);
    expensesSheet.getRange('A1:E1').setFontWeight('bold');
    expensesSheet.setFrozenRows(1);
    
    // Add data validation for categories
    const categoryRange = expensesSheet.getRange('B2:B1000');
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(EXPENSE_CATEGORIES, true)
      .build();
    categoryRange.setDataValidation(rule);
  }
  
  SpreadsheetApp.getUi().alert('Sheets setup complete!');
}

// ============================================
// SYNC FUNCTIONS
// ============================================

function pushSalesToBeloop() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sales');
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Sales sheet not found. Run Setup Sheets first.');
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  const sales = rows
    .filter(row => row[0] && row[7] !== 'Synced') // Has date and not synced
    .map((row, index) => ({
      rowIndex: index + 2,
      date: Utilities.formatDate(new Date(row[0]), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
      cashSale: Number(row[1]) || 0,
      bankSale: Number(row[2]) || 0,
      swiggy: Number(row[3]) || 0,
      zomato: Number(row[4]) || 0,
      otherOnline: Number(row[5]) || 0
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
      // Mark as synced
      sales.forEach(sale => {
        sheet.getRange(sale.rowIndex, 8).setValue('Synced');
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
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Expenses');
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Expenses sheet not found. Run Setup Sheets first.');
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  const rows = data.slice(1);
  
  const expenses = rows
    .filter(row => row[0] && row[4] !== 'Synced') // Has date and not synced
    .map((row, index) => ({
      rowIndex: index + 2,
      date: Utilities.formatDate(new Date(row[0]), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
      category: row[1],
      amount: Number(row[2]) || 0,
      description: row[3] || ''
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
      // Mark as synced
      expenses.forEach(expense => {
        sheet.getRange(expense.rowIndex, 5).setValue('Synced');
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
                expenseCategories: categories
            };
        }),
});
