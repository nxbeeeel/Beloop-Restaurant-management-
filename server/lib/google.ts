import { google } from 'googleapis';

// Initialize the Google Sheets API client
// Requires GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY env vars
// OR a GOOGLE_SERVICE_ACCOUNT_JSON containing the full JSON

const SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
];

function getAuth() {
    // Option 1: Full JSON in one env var (easiest for deployment)
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
        return new google.auth.GoogleAuth({
            credentials,
            scopes: SCOPES,
        });
    }

    // Option 2: Separate env vars
    if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
        return new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            },
            scopes: SCOPES,
        });
    }

    return null;
}

export async function getSheetsClient() {
    const auth = getAuth();
    if (!auth) return null;
    return google.sheets({ version: 'v4', auth });
}

export async function getDriveClient() {
    const auth = getAuth();
    if (!auth) return null;
    return google.drive({ version: 'v3', auth });
}

/**
 * Ensures a Google Sheet exists for the outlet.
 * If not, creates one and shares it with the manager.
 */
export async function ensureOutletSheet(
    outletName: string,
    managerEmail: string | null,
    existingSpreadsheetId: string | null
): Promise<string | null> {
    const sheets = await getSheetsClient();
    const drive = await getDriveClient();

    if (!sheets || !drive) {
        console.warn("Google API credentials not found. Skipping sheet creation.");
        return null;
    }

    // 1. If we already have an ID, verify it exists/is accessible (optional, skipping for speed)
    if (existingSpreadsheetId) {
        return existingSpreadsheetId;
    }

    // 2. Create new sheet
    try {
        const createRes = await sheets.spreadsheets.create({
            requestBody: {
                properties: {
                    title: `Beloop - ${outletName} Daily Closings`,
                },
                sheets: [
                    {
                        properties: {
                            title: 'DailyClosures',
                            gridProperties: {
                                frozenRowCount: 1,
                            },
                        },
                    },
                ],
            },
        });

        const spreadsheetId = createRes.data.spreadsheetId;
        if (!spreadsheetId) throw new Error("Failed to create spreadsheet");

        // 3. Add Header Row
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'DailyClosures!A1',
            valueInputOption: 'RAW',
            requestBody: {
                values: [[
                    "Date",
                    "Cash Sale",
                    "Bank Sale",
                    "Zomato Sale",
                    "Swiggy Sale",
                    "Total Sale",
                    "Total Expense",
                    "Profit",
                    "Stock Snapshot (JSON)"
                ]],
            },
        });

        // 4. Share with Manager (if email provided)
        if (managerEmail) {
            await drive.permissions.create({
                fileId: spreadsheetId,
                requestBody: {
                    role: 'writer', // or 'reader'
                    type: 'user',
                    emailAddress: managerEmail,
                },
            });
        }

        return spreadsheetId;
    } catch (error) {
        console.error("Error creating/sharing Google Sheet:", error);
        return null;
    }
}

/**
 * Appends a row to the sheet
 */
export async function appendToSheet(spreadsheetId: string, rowData: (string | number | boolean | null)[]) {
    const sheets = await getSheetsClient();
    if (!sheets) return;

    try {
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'DailyClosures!A1', // Appends to the first table found
            valueInputOption: 'RAW',
            requestBody: {
                values: [rowData],
            },
        });
    } catch (error) {
        console.error("Error appending to sheet:", error);
    }
}
