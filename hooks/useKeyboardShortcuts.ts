import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface KeyboardShortcut {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    action: () => void;
    description: string;
}

interface UseKeyboardShortcutsOptions {
    shortcuts: KeyboardShortcut[];
    enabled?: boolean;
}

export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) {
    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (!enabled) return;

            // Don't trigger shortcuts when typing in inputs
            const target = event.target as HTMLElement;
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            ) {
                // Allow Ctrl+S even in inputs
                if (!(event.ctrlKey && event.key === 's')) {
                    return;
                }
            }

            for (const shortcut of shortcuts) {
                const ctrlMatch = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey;
                const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
                const altMatch = shortcut.alt ? event.altKey : !event.altKey;
                const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

                if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
                    event.preventDefault();
                    shortcut.action();
                    break;
                }
            }
        },
        [shortcuts, enabled]
    );

    useEffect(() => {
        if (!enabled) return;

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown, enabled]);

    return { shortcuts };
}

// Predefined shortcuts
export const commonShortcuts = {
    save: (action: () => void): KeyboardShortcut => ({
        key: 's',
        ctrl: true,
        action,
        description: 'Save/Submit',
    }),
    newExpense: (action: () => void): KeyboardShortcut => ({
        key: 'e',
        ctrl: true,
        action,
        description: 'New Expense',
    }),
    newEntry: (action: () => void): KeyboardShortcut => ({
        key: 'n',
        ctrl: true,
        action,
        description: 'New Entry',
    }),
    help: (action: () => void): KeyboardShortcut => ({
        key: '?',
        ctrl: true,
        action,
        description: 'Show Shortcuts Help',
    }),
    undo: (action: () => void): KeyboardShortcut => ({
        key: 'z',
        ctrl: true,
        action,
        description: 'Undo',
    }),
    redo: (action: () => void): KeyboardShortcut => ({
        key: 'y',
        ctrl: true,
        action,
        description: 'Redo',
    }),
    escape: (action: () => void): KeyboardShortcut => ({
        key: 'Escape',
        action,
        description: 'Close/Cancel',
    }),
};

// Show toast notification for shortcut
export function showShortcutToast(description: string) {
    toast.info(`Shortcut: ${description}`, {
        duration: 1500,
    });
}
