import { useEffect, useState, useCallback } from 'react';

interface RecentItem {
    id: string;
    name: string;
    lastUsed: number;
}

interface UseRecentItemsOptions {
    key: string; // localStorage key
    maxItems?: number;
}

export function useRecentItems({ key, maxItems = 10 }: UseRecentItemsOptions) {
    const [recentItems, setRecentItems] = useState<RecentItem[]>([]);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(key);
            if (stored) {
                const items = JSON.parse(stored) as RecentItem[];
                setRecentItems(items);
            }
        } catch (error) {
            console.error('Failed to load recent items:', error);
        }
    }, [key]);

    // Add an item to recent items
    const addRecentItem = useCallback(
        (id: string, name: string) => {
            setRecentItems((prev) => {
                // Remove if already exists
                const filtered = prev.filter((item) => item.id !== id);

                // Add to front with current timestamp
                const updated = [
                    { id, name, lastUsed: Date.now() },
                    ...filtered,
                ].slice(0, maxItems); // Keep only maxItems

                // Save to localStorage
                try {
                    localStorage.setItem(key, JSON.stringify(updated));
                } catch (error) {
                    console.error('Failed to save recent items:', error);
                }

                return updated;
            });
        },
        [key, maxItems]
    );

    // Clear all recent items
    const clearRecentItems = useCallback(() => {
        setRecentItems([]);
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Failed to clear recent items:', error);
        }
    }, [key]);

    return {
        recentItems,
        addRecentItem,
        clearRecentItems,
    };
}

// Predefined keys for different types of recent items
export const RECENT_ITEMS_KEYS = {
    PRODUCTS: 'beloop_recent_products',
    EXPENSE_CATEGORIES: 'beloop_recent_expense_categories',
    SUPPLIERS: 'beloop_recent_suppliers',
} as const;
