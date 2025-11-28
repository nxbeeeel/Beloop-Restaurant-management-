'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

interface ShortcutsHelpModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const shortcuts = [
    { keys: ['Ctrl', 'S'], description: 'Save/Submit form' },
    { keys: ['Ctrl', 'E'], description: 'New Expense' },
    { keys: ['Ctrl', 'N'], description: 'New Entry' },
    { keys: ['Ctrl', 'Z'], description: 'Undo' },
    { keys: ['Ctrl', 'Y'], description: 'Redo' },
    { keys: ['Ctrl', '?'], description: 'Show this help' },
    { keys: ['Esc'], description: 'Close dialog/Cancel' },
];

export function ShortcutsHelpModal({ open, onOpenChange }: ShortcutsHelpModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Keyboard className="h-5 w-5" />
                        Keyboard Shortcuts
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-3">
                    {shortcuts.map((shortcut, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                            <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                            <div className="flex gap-1">
                                {shortcut.keys.map((key, keyIndex) => (
                                    <kbd
                                        key={keyIndex}
                                        className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500"
                                    >
                                        {key}
                                    </kbd>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-900 dark:text-blue-100">
                        💡 <strong>Tip:</strong> Press <kbd className="px-1 py-0.5 text-xs bg-white dark:bg-gray-700 border rounded">Ctrl</kbd> + <kbd className="px-1 py-0.5 text-xs bg-white dark:bg-gray-700 border rounded">?</kbd> anytime to see this help
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
