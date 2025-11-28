import { google } from 'googleapis';

// Initialize Google Sheets API
export async function getGoogleSheetsClient() {
    // In production, use service account credentials
    // For now, we'll use API key or OAuth
    const auth = new google.auth.GoogleAuth({
        credentials: process.env.GOOGLE_SERVICE_ACCOUNT_KEY
            ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
            : undefined,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    return sheets;
}

export interface SalesExportData {
    date: string;
    cashSale: number;
    bankSale: number;
    swiggy: number;
    zomato: number;
    totalSale: number;
    submittedBy: string;
}

export interface ExpenseExportData {
    date: string;
    category: string;
    amount: number;
    description: string;
    submittedBy: string;
}

export async function exportSalesToSheets(
    spreadsheetId: string,
    sheetName: string,
    data: SalesExportData[]
) {
    const sheets = await getGoogleSheetsClient();

    // Prepare headers
    const headers = ['Date', 'Cash Sale', 'Bank Sale', 'Swiggy', 'Zomato', 'Total Sale', 'Submitted By'];

    // Prepare rows
    const rows = data.map(sale => [
        sale.date,
        sale.cashSale,
        sale.bankSale,
        sale.swiggy,
        sale.zomato,
        sale.totalSale,
        sale.submittedBy,
    ]);

    // Clear existing data
    await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${sheetName}!A:Z`,
    });

    // Write new data
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'RAW',
        requestBody: {
            values: [headers, ...rows],
        },
    });

    // Format header row
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
            requests: [
                {
                    repeatCell: {
                        range: {
                            sheetId: 0,
                            startRowIndex: 0,
                            endRowIndex: 1,
                        },
                        cell: {
                            userEnteredFormat: {
                                backgroundColor: { red: 0.2, green: 0.2, blue: 0.8 },
                                textFormat: {
                                    foregroundColor: { red: 1, green: 1, blue: 1 },
                                    bold: true,
                                },
                            },
                        },
                        fields: 'userEnteredFormat(backgroundColor,textFormat)',
                    },
                },
            ],
        },
    });

    return { success: true, rowsExported: data.length };
}

export async function exportExpensesToSheets(
    spreadsheetId: string,
    sheetName: string,
    data: ExpenseExportData[]
) {
    const sheets = await getGoogleSheetsClient();

    const headers = ['Date', 'Category', 'Amount', 'Description', 'Submitted By'];

    const rows = data.map(expense => [
        expense.date,
        expense.category,
        expense.amount,
        expense.description,
        expense.submittedBy,
    ]);

    await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${sheetName}!A:Z`,
    });

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'RAW',
        requestBody: {
            values: [headers, ...rows],
        },
    });

    await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
            requests: [
                {
                    repeatCell: {
                        range: {
                            sheetId: 0,
                            startRowIndex: 0,
                            endRowIndex: 1,
                        },
                        cell: {
                            userEnteredFormat: {
                                backgroundColor: { red: 0.8, green: 0.2, blue: 0.2 },
                                textFormat: {
                                    foregroundColor: { red: 1, green: 1, blue: 1 },
                                    bold: true,
                                },
                            },
                        },
                        fields: 'userEnteredFormat(backgroundColor,textFormat)',
                    },
                },
            ],
        },
    });

    return { success: true, rowsExported: data.length };
}

export async function createNewSpreadsheet(title: string, outletName: string) {
    const sheets = await getGoogleSheetsClient();

    const response = await sheets.spreadsheets.create({
        requestBody: {
            properties: {
                title: `${outletName} - ${title}`,
            },
            sheets: [
                {
                    properties: {
                        title: 'Sales',
                        gridProperties: {
                            rowCount: 1000,
                            columnCount: 10,
                        },
                    },
                },
                {
                    properties: {
                        title: 'Expenses',
                        gridProperties: {
                            rowCount: 1000,
                            columnCount: 10,
                        },
                    },
                },
            ],
        },
    });

    return {
        spreadsheetId: response.data.spreadsheetId!,
        spreadsheetUrl: response.data.spreadsheetUrl!,
    };
}
