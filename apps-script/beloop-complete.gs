/**
 * ============================================
 * BELOOP RESTAURANT MANAGEMENT - GOOGLE SHEETS INTEGRATION
 * ============================================
 * 
 * Complete Apps Script for syncing restaurant data to Google Sheets
 * Handles: Daily Closing, Expenses, Sales, Inventory, Purchase Orders
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a new Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Replace all code with this script
 * 4. Update SPREADSHEET_ID below (or use PropertiesService)
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

// Main Spreadsheet (Daily Closings, Sales, Inventory, etc.)
const SPREADSHEET_ID = "1b5bTiFQpPAosnSm4gfu0Izq5Z3q4cBzWxgsYpfboEpo";

// Expenses Spreadsheet (separate sheet for expenses)
// Option 1: Use same sheet (set to same ID as above)
// Option 2: Use different sheet (set to different ID)
const EXPENSES_SPREADSHEET_ID = "1b5bTiFQpPAosnSm4gfu0Izq5Z3q4cBzWxgsYpfboEpo"; // Change this to use different sheet

// Advanced: Use different sheets for different data types
const SPREADSHEET_CONFIG = {
  dailyClosings: SPREADSHEET_ID,
  expenses: EXPENSES_SPREADSHEET_ID, // Can be different
  sales: SPREADSHEET_ID,
  inventory: SPREADSHEET_ID,
  wastage: SPREADSHEET_ID,
  purchaseOrders: SPREADSHEET_ID,
  monthlySummary: SPREADSHEET_ID,
  stockMoves: SPREADSHEET_ID
};

// Option 2: Use Script Properties (more secure)
// Set via: PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', 'your-id-here')
// const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');

// ============================================
// HELPER FUNCTIONS
// ============================================

function getOrCreateSheet(sheetName, headers, spreadsheetId) {
  // Use provided spreadsheet ID or default to main spreadsheet
  const ssId = spreadsheetId || SPREADSHEET_ID;
  const ss = SpreadsheetApp.openById(ssId);
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');
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

function formatMonth(monthString) {
  try {
    // Input: "2024-11" or "2024-11-01"
    // Output: "Nov 2024"
    const date = new Date(monthString + '-01');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthNames[date.getMonth()] + ' ' + date.getFullYear();
  } catch (e) {
    return monthString;
  }
}

// ============================================
// 1. DAILY CLOSING
// ============================================

function appendDailyClosure(data) {
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
    'Expense (Cash)',
    'Expense (Bank)',
    'Profit',
    'Difference',
    'Submitted By',
    'Timestamp'
  ];
  
  const sheet = getOrCreateSheet('Daily Closings', headers);
  
  sheet.appendRow([
    formatDate(data.date),
    data.outletName || '',
    formatCurrency(data.cashSale),
    formatCurrency(data.bankSale),
    formatCurrency(data.swiggy),
    formatCurrency(data.zomato),
    formatCurrency(data.swiggyPayout),
    formatCurrency(data.zomatoPayout),
    formatCurrency(data.otherOnline || 0),
    formatCurrency(data.otherOnlinePayout || 0),
    formatCurrency(data.totalSale),
    formatCurrency(data.cashInHand),
    formatCurrency(data.cashInBank),
    formatCurrency(data.cashWithdrawal),
    formatCurrency(data.totalExpense),
    formatCurrency(data.expenseCash),
    formatCurrency(data.expenseBank),
    formatCurrency(data.profit),
    formatCurrency(data.difference),
    data.staffName || '',
    new Date().toLocaleString()
  ]);
}

// ============================================
// 2. EXPENSES
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
  
  // Use separate expenses spreadsheet
  const sheet = getOrCreateSheet('Expenses', headers, SPREADSHEET_CONFIG.expenses);
  
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
// 3. SALES HISTORY
// ============================================

function appendSales(sales) {
  const headers = [
    'Date',
    'Outlet',
    'Cash Sale',
    'Bank Sale',
    'Swiggy',
    'Zomato',
    'Total Sale',
    'Total Expense',
    'Profit',
    'Staff',
    'Timestamp'
  ];
  
  const sheet = getOrCreateSheet('Sales History', headers);
  
  sales.forEach(sale => {
    sheet.appendRow([
      formatDate(sale.date),
      sale.outletName || '',
      formatCurrency(sale.cashSale),
      formatCurrency(sale.bankSale),
      formatCurrency(sale.swiggy),
      formatCurrency(sale.zomato),
      formatCurrency(sale.totalSale),
      formatCurrency(sale.totalExpense),
      formatCurrency(sale.profit),
      sale.staffName || '',
      new Date().toLocaleString()
    ]);
  });
}

// ============================================
// 4. INVENTORY / STOCK LEVELS
// ============================================

function updateInventory(products) {
  const headers = [
    'Product Name',
    'Category',
    'Current Stock',
    'Unit',
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
      product.supplierName || '',
      new Date().toLocaleString()
    ]);
  });
}

// ============================================
// 5. WASTAGE
// ============================================

function appendWastage(wastageRecords) {
  const headers = [
    'Date',
    'Outlet',
    'Product',
    'Quantity',
    'Unit',
    'Reason',
    'Cost',
    'Staff',
    'Timestamp'
  ];
  
  const sheet = getOrCreateSheet('Wastage', headers);
  
  wastageRecords.forEach(wastage => {
    sheet.appendRow([
      formatDate(wastage.date),
      wastage.outletName || '',
      wastage.productName,
      wastage.qty,
      wastage.unit || '',
      wastage.reason,
      formatCurrency(wastage.cost),
      wastage.staffName || '',
      new Date().toLocaleString()
    ]);
  });
}

// ============================================
// 6. PURCHASE ORDERS
// ============================================

function appendPurchaseOrders(orders) {
  const headers = [
    'Order ID',
    'Date',
    'Outlet',
    'Supplier',
    'Status',
    'Total Amount',
    'Items Count',
    'Sent At',
    'Received At',
    'Timestamp'
  ];
  
  const sheet = getOrCreateSheet('Purchase Orders', headers);
  
  orders.forEach(order => {
    sheet.appendRow([
      order.id.slice(-8),
      formatDate(order.createdAt),
      order.outletName || '',
      order.supplierName,
      order.status,
      formatCurrency(order.totalAmount),
      order.itemsCount || 0,
      order.sentAt ? formatDate(order.sentAt) : '',
      order.receivedAt ? formatDate(order.receivedAt) : '',
      new Date().toLocaleString()
    ]);
  });
}

// ============================================
// 7. MONTHLY SUMMARY
// ============================================

function updateMonthlySummary(summary) {
  const headers = [
    'Month',
    'Outlet',
    'Total Sales',
    'Total Expenses',
    'Profit',
    'Avg Daily Sale',
    'Avg Daily Expense',
    'Days Operated',
    'Last Updated'
  ];
  
  const sheet = getOrCreateSheet('Monthly Summary', headers);
  
  sheet.appendRow([
    formatMonth(summary.month), // Format as "Nov 2024" instead of "2024-11"
    summary.outletName || '',
    formatCurrency(summary.totalSales),
    formatCurrency(summary.totalExpenses),
    formatCurrency(summary.profit),
    formatCurrency(summary.avgDailySale),
    formatCurrency(summary.avgDailyExpense),
    summary.daysOperated || 0,
    new Date().toLocaleString()
  ]);
}

// ============================================
// 8. STOCK MOVEMENTS
// ============================================

function appendStockMoves(moves) {
  const headers = [
    'Date',
    'Outlet',
    'Product',
    'Type',
    'Quantity',
    'Notes',
    'Timestamp'
  ];
  
  const sheet = getOrCreateSheet('Stock Movements', headers);
  
  moves.forEach(move => {
    sheet.appendRow([
      formatDate(move.date),
      move.outletName || '',
      move.productName,
      move.type,
      move.qty,
      move.notes || '',
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
      case 'dailyClosure':
        appendDailyClosure(payload.data);
        break;
        
      case 'expenses':
        appendExpenses(payload.data);
        break;
        
      case 'sales':
        appendSales(payload.data);
        break;
        
      case 'inventory':
        updateInventory(payload.data);
        break;
        
      case 'wastage':
        appendWastage(payload.data);
        break;
        
      case 'purchaseOrders':
        appendPurchaseOrders(payload.data);
        break;
        
      case 'monthlySummary':
        updateMonthlySummary(payload.data);
        break;
        
      case 'stockMoves':
        appendStockMoves(payload.data);
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
// TEST FUNCTION (Run this to test)
// ============================================

function testDailyClosure() {
  const testData = {
    action: 'dailyClosure',
    data: {
      date: '2024-11-25',
      outletName: 'Test Outlet',
      cashSale: 5000,
      bankSale: 3000,
      swiggy: 1500,
      zomato: 1000,
      swiggyPayout: 1350,
      zomatoPayout: 900,
      totalSale: 10500,
      cashInHand: 4500,
      cashInBank: 3200,
      cashWithdrawal: 1000,
      totalExpense: 3500,
      expenseCash: 2000,
      expenseBank: 1500,
      profit: 7000,
      difference: 0,
      staffName: 'Test Manager'
    }
  };
  
  const mockEvent = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };
  
  const result = doPost(mockEvent);
  Logger.log(result.getContent());
}

// ============================================
// UTILITY: Create Dashboard Sheet
// ============================================

function createDashboard() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let dashboard = ss.getSheetByName('Dashboard');
  
  if (!dashboard) {
    dashboard = ss.insertSheet('Dashboard', 0); // First sheet
  }
  
  dashboard.clear();
  
  // Title
  dashboard.getRange('A1').setValue('BELOOP RESTAURANT DASHBOARD');
  dashboard.getRange('A1').setFontSize(18).setFontWeight('bold');
  
  // Summary formulas
  dashboard.getRange('A3').setValue('Total Sales (This Month):');
  dashboard.getRange('B3').setFormula('=SUMIF(\'Daily Closings\'!A:A,">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),\'Daily Closings\'!I:I)');
  
  dashboard.getRange('A4').setValue('Total Expenses (This Month):');
  dashboard.getRange('B4').setFormula('=SUMIF(\'Daily Closings\'!A:A,">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),\'Daily Closings\'!M:M)');
  
  dashboard.getRange('A5').setValue('Profit (This Month):');
  dashboard.getRange('B5').setFormula('=B3-B4');
  
  dashboard.getRange('A7').setValue('Last Updated:');
  dashboard.getRange('B7').setValue(new Date().toLocaleString());
  
  // Format
  dashboard.getRange('B3:B5').setNumberFormat('$#,##0.00');
  dashboard.setColumnWidth(1, 250);
  dashboard.setColumnWidth(2, 200);
}

/**
 * ============================================
 * DEPLOYMENT CHECKLIST
 * ============================================
 * 
 * 1. ✅ Update SPREADSHEET_ID above
 * 2. ✅ Run testDailyClosure() to verify it works
 * 3. ✅ Deploy as Web App:
 *    - Click Deploy > New deployment
 *    - Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. ✅ Copy Web App URL
 * 5. ✅ Paste in Beloop Settings > Google Sheets
 * 6. ✅ Test by submitting a daily closing
 * 7. ✅ Run createDashboard() to add summary sheet
 * 
 * ============================================
 */
