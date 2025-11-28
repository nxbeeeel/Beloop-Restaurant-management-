/**
 * Append a daily‑closure row to the sheet.
 * Expected payload:
 * {
 *   date: "2025-11-24",
 *   cashSale: 1200,
 *   bankSale: 300,
 *   zomatoSale: 150,
 *   swiggySale: 80,
 *   totalSale: 1730,
 *   totalExpense: 350.45,
 *   profit: 1379.55,
 *   stockSnapshot: {"prod‑A":12,"prod‑B":5}
 * }
 */
function appendDailyClosure(data) {
  // REPLACE WITH YOUR SHEET ID
  // You can also pass it in the payload if you want one script for multiple sheets, 
  // but usually it's safer to hardcode per deployment or read from script properties.
  const SPREADSHEET_ID = "YOUR_SPREADSHEET_ID_HERE"; 
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("DailyClosures") || ss.insertSheet("DailyClosures");

  // Header row (only once)
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Date",
      "Cash Sale",
      "Bank Sale",
      "Zomato Sale",
      "Swiggy Sale",
      "Total Sale",
      "Total Expense",
      "Profit",
      "Stock Snapshot (JSON)",
    ]);
  }

  sheet.appendRow([
    data.date,
    data.cashSale,
    data.bankSale,
    data.zomatoSale,
    data.swiggySale,
    data.totalSale,
    data.totalExpense,
    data.profit,
    JSON.stringify(data.stockSnapshot),
  ]);
}

/**
 * HTTP POST entry point.
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    appendDailyClosure(payload);
    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
