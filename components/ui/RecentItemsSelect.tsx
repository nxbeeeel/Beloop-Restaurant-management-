'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock } from 'lucide-react';

interface RecentItem {
    id: string;
    name: string;
    lastUsed: number;
}

interface RecentItemsSelectProps {
    recentItems: RecentItem[];
    onSelect: (id: string, name: string) => void;
    placeholder?: string;
    emptyMessage?: string;
}

export function RecentItemsSelect({
    recentItems,
    onSelect,
    placeholder = 'Recent items...',
    emptyMessage = 'No recent items',
}: RecentItemsSelectProps) {
    if (recentItems.length === 0) {
        return null;
    }

    return (
        <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Select
                onValueChange={(value) => {
                    const item = recentItems.find((i) => i.id === value);
                    if (item) {
                        onSelect(item.id, item.name);
                    }
                }}
            >
                <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    {recentItems.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                            {item.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
