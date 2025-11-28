---
description: Daily Closing & Google Sheets Setup
---
# Daily Closing & Google Sheets Integration

This workflow explains how to set up the Daily Closing feature and connect it to Google Sheets using Apps Script.

## 1. Database Setup
Ensure the database schema is up to date.
```bash
npx prisma migrate dev --name daily_closure
npx prisma generate
```

## 2. Google Apps Script Setup (Per Outlet)
For each outlet, you need to set up a Google Sheet and an Apps Script to receive data.

1.  **Create a Google Sheet**:
    *   Log in with the Google Account that should own the sheet (e.g., the Outlet Manager's account or a central Brand account).
    *   Create a new Sheet (e.g., "Outlet A - Daily Closings").

2.  **Add Apps Script**:
    *   In the Sheet, go to **Extensions** > **Apps Script**.
    *   Delete any code in `Code.gs` and paste the code from `apps-script/dailyClosure.gs` (in this repo).
    *   **Important**: Update the `SPREADSHEET_ID` variable in the script with the ID of your sheet (found in the URL).

3.  **Deploy as Web App**:
    *   Click **Deploy** > **New deployment**.
    *   Select type: **Web app**.
    *   Description: "Daily Closure API".
    *   **Execute as**: Me (the account owner).
    *   **Who has access**: **Anyone** (This is crucial so the Beloop server can send data without complex OAuth).

4.  **Connect to Beloop**:
    *   Copy the **Web App URL** (starts with `script.google.com`).
    *   Go to your Beloop Database (via Prisma Studio or Admin UI).
    *   Find the **Outlet** record.
    *   Paste the URL into the `sheetExportUrl` field.

## 3. Usage
1.  Staff/Manager logs in and goes to **Daily Closing**.
2.  They fill out the form and click **Save**.
3.  The data is saved to the Beloop database.
4.  Beloop automatically sends the data to the Apps Script URL.
5.  The Apps Script adds a new row to the Google Sheet.

## 4. Troubleshooting
*   **Data not showing in Sheet?**
    *   Check if `sheetExportUrl` is correct in the database.
    *   Check the Apps Script **Executions** tab for errors.
    *   Ensure the deployment allows "Anyone" to access.
