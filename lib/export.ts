/**
 * Excel/CSV Export Utility
 * 
 * Provides one-click export for all data tables
 */

export interface ExportColumn<T> {
    header: string;
    accessor: keyof T | ((row: T) => string | number);
    format?: (value: unknown) => string;
}

/**
 * Format a value for CSV export
 */
function formatCsvValue(value: unknown): string {
    if (value === null || value === undefined) return "";
    if (typeof value === "number") return value.toString();
    if (value instanceof Date) {
        return value.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }
    const str = String(value);
    // Escape quotes and wrap in quotes if contains comma or newline
    if (str.includes(",") || str.includes("\n") || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

/**
 * Export data to CSV and trigger download
 */
export function exportToCsv<T>(
    data: T[],
    columns: ExportColumn<T>[],
    filename: string
): void {
    // Build header row
    const headers = columns.map(col => col.header);

    // Build data rows
    const rows = data.map(row => {
        return columns.map(col => {
            let value: unknown;
            if (typeof col.accessor === "function") {
                value = col.accessor(row);
            } else {
                value = row[col.accessor];
            }
            if (col.format) {
                value = col.format(value);
            }
            return formatCsvValue(value);
        });
    });

    // Combine into CSV string
    const csv = [
        headers.join(","),
        ...rows.map(r => r.join(","))
    ].join("\n");

    // Create blob and download
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Format currency for display/export
 */
export function formatCurrency(amount: number | string | null | undefined): string {
    if (amount === null || amount === undefined) return "₹0.00";
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format date for display/export
 */
export function formatDate(date: Date | string | null | undefined): string {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

/**
 * Format date with time
 */
export function formatDateTime(date: Date | string | null | undefined): string {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}
