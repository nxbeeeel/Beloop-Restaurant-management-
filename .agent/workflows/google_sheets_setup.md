---
description: Google Sheets Integration Setup
---
# Google Sheets Integration

This workflow explains how to set up the automated Google Sheets integration using a Service Account.

## 1. Create a Google Cloud Project
1.  Go to [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a new project (e.g., "Beloop Tracker").
3.  Enable the **Google Sheets API** and **Google Drive API**.

## 2. Create a Service Account
1.  Go to **IAM & Admin** > **Service Accounts**.
2.  Click **Create Service Account**.
3.  Name it (e.g., "beloop-sheets-bot").
4.  Grant it the **Editor** role (or specifically Sheets/Drive access).
5.  Click on the newly created service account > **Keys**.
6.  Add Key > **Create new key** > **JSON**.
7.  Download the JSON file.

## 3. Configure Environment Variables
You have two options to configure the credentials in your `.env` file.

### Option A: Full JSON (Recommended for Vercel/Production)
Minify the JSON content (remove newlines) and paste it as a single string.
```env
GOOGLE_SERVICE_ACCOUNT_JSON='{"type": "service_account", ...}'
```

### Option B: Separate Variables
Open the JSON file and copy the `client_email` and `private_key`.
```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

## 4. How it Works
1.  When a Daily Closure is submitted, the system checks if the Outlet has a `spreadsheetId`.
2.  If NOT, it uses the Service Account to **create a new Google Sheet**.
3.  It names the sheet `Beloop - [Outlet Name] Daily Closings`.
4.  It **shares** the sheet with the **Outlet Manager's email** (as a Writer).
5.  It saves the `spreadsheetId` to the database.
6.  It appends the daily data to the sheet.

## 5. Troubleshooting
*   **"Google API credentials not found"**: Check your `.env` file.
*   **"Error creating/sharing"**: Ensure the Service Account has the correct permissions and the Google Sheets API is enabled in the Cloud Console.
*   **User can't see sheet**: Check if the Outlet Manager's email in the database matches their Google account email.
