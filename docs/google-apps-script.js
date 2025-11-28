/**
 * Beloop - Google Apps Script Backend
 * Multi-tenant version of Smoocho Tracker
 * Each outlet gets their own spreadsheet in their Google Drive
 */

// ---- Configuration ----
// Expense categories – must match Smoocho structure
const EXPENSE_CATEGORIES = [
    'Rent', 'Staff', 'Bake', 'Store', 'Biscoff', 'Ice crm', 'Oil',
    'Disposbl', 'Smoocho Disposable', 'Water Can', 'Water Bottle', 'Good Life', 'Wipping',
    'Promotion', 'Nuts', 'Custard', 'Kiwi', 'Strawberry', 'Mango', 'Robst', 'pinaple', 'Misc'
];

const FRUIT_COLUMNS = ['Kiwi', 'Strawberry', 'Mango', 'Robst', 'pinaple'];
const appName = "Beloop";

// ---- HTTP Entrypoints ----
function doPost(e) {
    try {
        const data = JSON.parse(e.postData.contents || '{}');
        const { type, outletName, month, year, sales, expenses } = data;

        if (type === 'both' || type === 'sales') {
            const result = handleBulkSales(outletName, month, year, sales);
            if (!result.success) return jsonResponse(result);
        }

        if (type === 'both' || type === 'expenses') {
            const result = handleBulkExpenses(outletName, month, year, expenses);
            if (!result.success) return jsonResponse(result);
        }

        // Get or create the spreadsheet
        const spreadsheet = getOrCreateOutletSpreadsheet(outletName, month, year);

        return jsonResponse({
            success: true,
            spreadsheetId: spreadsheet.getId(),
            spreadsheetUrl: spreadsheet.getUrl(),
            message: 'Data exported successfully'
        });

    } catch (error) {
        return jsonResponse({
            success: false,
            error: error.toString()
        });
    }
}

function doGet(e) {
    return jsonResponse({
        success: true,
        message: 'Beloop Apps Script is running',
        version: '2.0'
    });
}

// ---- Bulk Sales Handler ----
function handleBulkSales(outletName, month, year, salesData) {
    try {
        if (!salesData || salesData.length === 0) {
            return { success: true, message: 'No sales data to export' };
        }

        const spreadsheet = getOrCreateOutletSpreadsheet(outletName, month, year);
        const monthName = getMonthName(year, month);
        const sheet = getOrCreateSheet(spreadsheet, 'Sales');

        ensureSalesHeaders(sheet);

        // Clear existing data (keep headers)
        const lastRow = sheet.getLastRow();
        if (lastRow > 1) {
            sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clear();
        }

        // Sort sales by date
        salesData.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Write all sales data
        let previousCashInHand = 0;
        salesData.forEach((sale, index) => {
            const rowIndex = index + 2; // Start from row 2 (after header)
            const rowData = buildSalesRowData(sale, rowIndex, previousCashInHand);
            sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
            formatSalesRow(sheet, rowIndex);

            // Update previousCashInHand for next iteration
            // Cash in Hand is in column H (index 7 in rowData)
            previousCashInHand = parseFloat(sale.cashInHand) || 0;
        });

        // Add TOTAL row
        updateMonthTotals(sheet);

        return { success: true };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

// ---- Bulk Expenses Handler ----
function handleBulkExpenses(outletName, month, year, expensesData) {
    try {
        if (!expensesData || expensesData.length === 0) {
            return { success: true, message: 'No expenses data to export' };
        }

        const spreadsheet = getOrCreateOutletSpreadsheet(outletName, month, year);
        const sheet = getOrCreateSheet(spreadsheet, 'Expenses');

        ensureExpenseHeaders(sheet);

        // Clear existing data (keep headers)
        const lastRow = sheet.getLastRow();
        if (lastRow > 1) {
            sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clear();
        }

        // Group expenses by date
        const expensesByDate = {};
        expensesData.forEach(expense => {
            const dateKey = formatDateKey(expense.date);
            if (!expensesByDate[dateKey]) {
                expensesByDate[dateKey] = {
                    date: expense.date,
                    categories: {},
                    paymentMethod: expense.paymentMethod || 'cash'
                };
            }

            const category = expense.category;
            if (!expensesByDate[dateKey].categories[category]) {
                expensesByDate[dateKey].categories[category] = 0;
            }
            expensesByDate[dateKey].categories[category] += parseFloat(expense.amount) || 0;
        });

        // Write grouped expenses
        const dates = Object.keys(expensesByDate).sort();
        dates.forEach((dateKey, index) => {
            const rowIndex = index + 2;
            const dayExpenses = expensesByDate[dateKey];
            const rowData = buildExpenseRowData(dayExpenses, rowIndex);
            sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
            formatExpenseRow(sheet, rowIndex);
        });

        // Add TOTAL row
        updateMonthTotals(sheet);

        return { success: true };
    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

// ---- Row Builders ----
function buildSalesRowData(sale, rowIndex, yesterdayCashInHand) {
    const cashSale = parseFloat(sale.cashSale) || 0;
    const bankSale = parseFloat(sale.bankSale) || 0;
    const swiggy = parseFloat(sale.swiggy) || 0;
    const zomato = parseFloat(sale.zomato) || 0;
    const swiggyPayout = parseFloat(sale.swiggyPayout) || 0;
    const zomatoPayout = parseFloat(sale.zomatoPayout) || 0;
    const cashInHand = parseFloat(sale.cashInHand) || 0;
    const cashInBank = parseFloat(sale.cashInBank) || 0;
    const cashWithdrawal = parseFloat(sale.cashWithdrawal) || 0;

    const row = [
        formatDate(sale.date),
        cashSale,
        bankSale,
        swiggy,
        zomato,
        swiggyPayout,
        zomatoPayout,
        cashInHand,
        cashInBank,
        cashWithdrawal,
    ];

    // Total Sale = Cash Sale + Bank Sale + Swiggy + Zomato
    row.push(`=B${rowIndex}+C${rowIndex}+D${rowIndex}+E${rowIndex}`); // Column K

    row.push(0); // Column L: Expense Cash (will be synced)
    row.push(0); // Column M: Expense Bank (will be synced)
    row.push(`=L${rowIndex}+M${rowIndex}`); // Column N: Total Expense

    // Profit = Cash Sale + Bank Sale + Swiggy Payout + Zomato Payout - Total Expense
    row.push(`=B${rowIndex}+C${rowIndex}+F${rowIndex}+G${rowIndex}-N${rowIndex}`); // Column O

    // Difference = (Yesterday Cash in Hand + Today Cash Sale - Cash Expense) - Today Cash in Hand
    row.push(`=(${yesterdayCashInHand}+B${rowIndex}-L${rowIndex})-H${rowIndex}`); // Column P

    return row;
}

function buildExpenseRowData(dayExpenses, rowIndex) {
    const row = [formatDate(dayExpenses.date)];

    // Add all category columns
    EXPENSE_CATEGORIES.forEach(category => {
        row.push(dayExpenses.categories[category] || 0);
    });

    // Fruit Sum formula
    const fruitStart = 2 + EXPENSE_CATEGORIES.indexOf(FRUIT_COLUMNS[0]);
    const fruitEnd = 2 + EXPENSE_CATEGORIES.indexOf(FRUIT_COLUMNS[FRUIT_COLUMNS.length - 1]);
    row.push(`=SUM(${getColumnLetter(fruitStart)}${rowIndex}:${getColumnLetter(fruitEnd)}${rowIndex})`);

    // Total Expense formula
    const totalStartCol = 2;
    const totalEndCol = 2 + EXPENSE_CATEGORIES.length - 1;
    row.push(`=SUM(${getColumnLetter(totalStartCol)}${rowIndex}:${getColumnLetter(totalEndCol)}${rowIndex})`);

    // Payment Method
    row.push(dayExpenses.paymentMethod);

    return row;
}

// ---- Sheet Setup ----
function ensureSalesHeaders(sheet) {
    if (sheet.getLastRow() > 0) return;

    const headers = [
        'Date', 'Cash Sale', 'Bank Sale', 'Swiggy', 'Zomato',
        'Swiggy Payout', 'Zomato Payout', 'Cash in hand', 'Cash in bank',
        'Cash Withdrawal', 'Total Sale', 'Expense Cash', 'Expense Bank',
        'Total Expense', 'Profit', 'Difference',
    ];

    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    formatHeaderRow(sheet, '#4285F4'); // Blue for Sales
}

function ensureExpenseHeaders(sheet) {
    if (sheet.getLastRow() > 0) return;

    const headers = [
        'Date',
        ...EXPENSE_CATEGORIES,
        'Fruit_Sum',
        'Total Expense',
        'Payment Method',
    ];

    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    formatHeaderRow(sheet, '#EA4335'); // Red for Expenses
}

// ---- Formatting ----
function formatHeaderRow(sheet, color) {
    const range = sheet.getRange(1, 1, 1, sheet.getLastColumn());
    range.setBackground(color);
    range.setFontColor('#ffffff');
    range.setFontWeight('bold');
    range.setHorizontalAlignment('center');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, sheet.getLastColumn());
}

function formatSalesRow(sheet, rowIndex) {
    sheet.getRange(rowIndex, 1).setNumberFormat('dd-mmm');
    const lastCol = 16;
    if (lastCol > 1) {
        sheet.getRange(rowIndex, 2, 1, lastCol - 1).setNumberFormat('"₹"#,##0.00');
    }
}

function formatExpenseRow(sheet, rowIndex) {
    sheet.getRange(rowIndex, 1).setNumberFormat('dd-mmm');
    const lastCol = sheet.getLastColumn();
    if (lastCol > 1) {
        sheet.getRange(rowIndex, 2, 1, lastCol - 2).setNumberFormat('"₹"#,##0.00');
    }
}

function updateMonthTotals(sheet) {
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return;

    const lastCol = sheet.getLastColumn();

    // Delete existing TOTAL rows
    for (let i = lastRow; i >= 2; i--) {
        const cellValue = sheet.getRange(i, 1).getValue();
        if (cellValue && cellValue.toString().toUpperCase() === 'TOTAL') {
            sheet.deleteRow(i);
        }
    }

    // Add new TOTAL row
    const currentLastRow = sheet.getLastRow();
    const totalsRow = currentLastRow + 1;

    sheet.getRange(totalsRow, 1).setValue('TOTAL');
    sheet.getRange(totalsRow, 1).setFontWeight('bold');
    sheet.getRange(totalsRow, 1).setBackground('#FFD966');

    // Add SUM formulas
    for (let col = 2; col <= lastCol; col++) {
        const columnLetter = getColumnLetter(col);
        sheet.getRange(totalsRow, col).setFormula(`=SUM(${columnLetter}2:${columnLetter}${currentLastRow})`);
        sheet.getRange(totalsRow, col).setFontWeight('bold');
        sheet.getRange(totalsRow, col).setBackground('#FFD966');
        sheet.getRange(totalsRow, col).setNumberFormat('"₹"#,##0.00');
    }
}

// ---- Spreadsheet Management ----
function getOrCreateOutletSpreadsheet(outletName, month, year) {
    const monthName = getMonthName(year, month);
    const title = `${outletName} - ${monthName}`;

    // Check if spreadsheet exists
    const files = DriveApp.getFilesByName(title);
    if (files.hasNext()) {
        return SpreadsheetApp.open(files.next());
    }

    // Create new spreadsheet
    const spreadsheet = SpreadsheetApp.create(title);

    // Rename default sheet to Sales
    const salesSheet = spreadsheet.getActiveSheet();
    salesSheet.setName('Sales');

    // Create Expenses sheet
    spreadsheet.insertSheet('Expenses');

    return spreadsheet;
}

function getOrCreateSheet(spreadsheet, name) {
    let sheet = spreadsheet.getSheetByName(name);
    if (sheet) return sheet;
    return spreadsheet.insertSheet(name);
}

// ---- Helpers ----
function formatDate(dateInput) {
    const date = new Date(dateInput);
    return Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd-MMM-yyyy');
}

function formatDateKey(dateInput) {
    const date = new Date(dateInput);
    return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function getMonthName(year, month) {
    const date = new Date(year, month - 1, 1);
    return Utilities.formatDate(date, Session.getScriptTimeZone(), 'MMM yyyy').toUpperCase();
}

function getColumnLetter(index) {
    let letter = '';
    while (index > 0) {
        const mod = (index - 1) % 26;
        letter = String.fromCharCode(65 + mod) + letter;
        index = Math.floor((index - 1) / 26);
    }
    return letter;
}

function jsonResponse(payload) {
    return ContentService
        .createTextOutput(JSON.stringify(payload))
        .setMimeType(ContentService.MimeType.JSON);
}
