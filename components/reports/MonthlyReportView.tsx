// TEMPORARILY DISABLED - Reports router is disabled
// TODO: Re-enable when reports router is fixed

interface MonthlyReportViewProps {
    initialOutletId: string;
    outlets: { id: string; name: string }[];
}

export function MonthlyReportView({ initialOutletId, outlets }: MonthlyReportViewProps) {
    return (
        <div className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Monthly Reports Temporarily Unavailable</h2>
            <p className="text-muted-foreground">
                This feature is currently being updated. Please check back later.
            </p>
        </div>
    );
}
