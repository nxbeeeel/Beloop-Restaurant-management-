"use client";

import * as React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Lock, AlertTriangle, Bell, Loader2, ShieldCheck, ShieldX } from "lucide-react";

export type PinAction =
    | "EDIT_ORDER"
    | "VOID_ORDER"
    | "WITHDRAWAL"
    | "PRICE_OVERRIDE"
    | "STOCK_ADJUSTMENT"
    | "REFUND"
    | "MODIFY_CLOSING"
    | "SUPPLIER_PAYMENT"
    | "MANUAL_DISCOUNT";

export interface PinEntryModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    action: PinAction;
    actionDescription: string;
    targetDescription?: string; // e.g., "Order #ORD-1234 (₹1,250)"
    requiresManagerPin?: boolean;
    managerName?: string;
    onVerify: (pin: string) => Promise<{ success: boolean; error?: string }>;
    onSuccess?: () => void;
    warnings?: string[];
}

const ACTION_LABELS: Record<PinAction, string> = {
    EDIT_ORDER: "Edit Order",
    VOID_ORDER: "Void/Delete Order",
    WITHDRAWAL: "Cash Withdrawal",
    PRICE_OVERRIDE: "Price Override",
    STOCK_ADJUSTMENT: "Stock Adjustment",
    REFUND: "Refund Order",
    MODIFY_CLOSING: "Modify Daily Closing",
    SUPPLIER_PAYMENT: "Supplier Payment",
    MANUAL_DISCOUNT: "Manual Discount",
};

const PIN_LENGTH = 4;

export function PinEntryModal({
    open,
    onOpenChange,
    action,
    actionDescription,
    targetDescription,
    requiresManagerPin = false,
    managerName,
    onVerify,
    onSuccess,
    warnings = [],
}: PinEntryModalProps) {
    const [pin, setPin] = useState<string[]>(Array(PIN_LENGTH).fill(""));
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (open) {
            setPin(Array(PIN_LENGTH).fill(""));
            setError(null);
            setIsSuccess(false);
            setIsVerifying(false);
            // Focus first input after a brief delay for animation
            setTimeout(() => {
                inputRefs.current[0]?.focus();
            }, 100);
        }
    }, [open]);

    const handleInputChange = useCallback((index: number, value: string) => {
        // Only allow digits
        const digit = value.replace(/\D/g, "").slice(-1);

        setPin((prev) => {
            const newPin = [...prev];
            newPin[index] = digit;
            return newPin;
        });
        setError(null);

        // Auto-advance to next input
        if (digit && index < PIN_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    }, []);

    const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        // Handle backspace
        if (e.key === "Backspace") {
            if (!pin[index] && index > 0) {
                // If current is empty, go back and clear previous
                setPin((prev) => {
                    const newPin = [...prev];
                    newPin[index - 1] = "";
                    return newPin;
                });
                inputRefs.current[index - 1]?.focus();
            } else {
                // Clear current
                setPin((prev) => {
                    const newPin = [...prev];
                    newPin[index] = "";
                    return newPin;
                });
            }
            e.preventDefault();
        }

        // Handle arrow keys
        if (e.key === "ArrowLeft" && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
        if (e.key === "ArrowRight" && index < PIN_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    }, [pin]);

    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, PIN_LENGTH);

        if (pastedData.length > 0) {
            const newPin = Array(PIN_LENGTH).fill("");
            for (let i = 0; i < pastedData.length; i++) {
                newPin[i] = pastedData[i];
            }
            setPin(newPin);

            // Focus last filled input or last input
            const lastFilledIndex = Math.min(pastedData.length - 1, PIN_LENGTH - 1);
            inputRefs.current[lastFilledIndex]?.focus();
        }
    }, []);

    // Auto-submit when all digits are entered
    useEffect(() => {
        const fullPin = pin.join("");
        if (fullPin.length === PIN_LENGTH && !isVerifying && !isSuccess) {
            handleVerify();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pin, isVerifying, isSuccess]);

    const handleVerify = async () => {
        const fullPin = pin.join("");
        if (fullPin.length !== PIN_LENGTH) {
            setError("Please enter all 4 digits");
            return;
        }

        setIsVerifying(true);
        setError(null);

        try {
            const result = await onVerify(fullPin);

            if (result.success) {
                setIsSuccess(true);
                // Brief success animation before closing
                setTimeout(() => {
                    onOpenChange(false);
                    onSuccess?.();
                }, 800);
            } else {
                setError(result.error || "Invalid PIN. Please try again.");
                setPin(Array(PIN_LENGTH).fill(""));
                setTimeout(() => {
                    inputRefs.current[0]?.focus();
                }, 100);
            }
        } catch {
            setError("Verification failed. Please try again.");
            setPin(Array(PIN_LENGTH).fill(""));
        } finally {
            setIsVerifying(false);
        }
    };

    const handleCancel = () => {
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden">
                {/* Header */}
                <div className={cn(
                    "px-6 pt-6 pb-4 text-center",
                    isSuccess ? "bg-emerald-50" : requiresManagerPin ? "bg-amber-50" : "bg-slate-50"
                )}>
                    <div className={cn(
                        "mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4",
                        isSuccess
                            ? "bg-emerald-100 text-emerald-600"
                            : requiresManagerPin
                                ? "bg-amber-100 text-amber-600"
                                : "bg-slate-200 text-slate-600"
                    )}>
                        {isSuccess ? (
                            <ShieldCheck className="w-8 h-8" />
                        ) : isVerifying ? (
                            <Loader2 className="w-8 h-8 animate-spin" />
                        ) : (
                            <Lock className="w-8 h-8" />
                        )}
                    </div>

                    <DialogHeader className="space-y-1">
                        <DialogTitle className="text-xl">
                            {isSuccess ? "Verified!" : `${requiresManagerPin ? "Manager " : ""}PIN Required`}
                        </DialogTitle>
                        <DialogDescription className="text-slate-600">
                            {isSuccess
                                ? "Authorization successful"
                                : `Authorization required for: ${ACTION_LABELS[action]}`}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {/* Content */}
                <div className="px-6 py-4 space-y-4">
                    {/* Target Description */}
                    {targetDescription && !isSuccess && (
                        <div className="text-center p-3 bg-slate-100 rounded-lg">
                            <p className="text-sm text-slate-500 mb-1">{actionDescription}</p>
                            <p className="font-semibold text-slate-900">{targetDescription}</p>
                        </div>
                    )}

                    {/* Warnings */}
                    {warnings.length > 0 && !isSuccess && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                                <div className="text-sm text-amber-800 space-y-1">
                                    {warnings.map((warning, i) => (
                                        <p key={i}>{warning}</p>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PIN Input */}
                    {!isSuccess && (
                        <>
                            <div className="flex justify-center gap-3" onPaste={handlePaste}>
                                {Array.from({ length: PIN_LENGTH }).map((_, index) => (
                                    <input
                                        key={index}
                                        ref={(el) => { inputRefs.current[index] = el; }}
                                        type="password"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={pin[index]}
                                        onChange={(e) => handleInputChange(index, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(index, e)}
                                        disabled={isVerifying}
                                        className={cn(
                                            "w-14 h-14 text-center text-2xl font-bold rounded-xl border-2 transition-all duration-200",
                                            "focus:outline-none focus:ring-2 focus:ring-offset-2",
                                            error
                                                ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500"
                                                : pin[index]
                                                    ? "border-emerald-300 bg-emerald-50 focus:border-emerald-500 focus:ring-emerald-500"
                                                    : "border-slate-200 bg-white focus:border-slate-400 focus:ring-slate-400",
                                            isVerifying && "opacity-50 cursor-not-allowed"
                                        )}
                                        aria-label={`PIN digit ${index + 1}`}
                                    />
                                ))}
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="flex items-center justify-center gap-2 text-red-600">
                                    <ShieldX className="w-4 h-4" />
                                    <p className="text-sm font-medium">{error}</p>
                                </div>
                            )}

                            {/* Manager Notification Notice */}
                            {managerName && (
                                <div className="flex items-center justify-center gap-2 text-slate-500">
                                    <Bell className="w-4 h-4" />
                                    <p className="text-sm">
                                        {managerName} will be notified
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                {!isSuccess && (
                    <div className="px-6 pb-6">
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={handleCancel}
                            disabled={isVerifying}
                        >
                            Cancel
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

// Hook for easy usage
export function usePinVerification() {
    const [modalState, setModalState] = useState<{
        open: boolean;
        action: PinAction;
        actionDescription: string;
        targetDescription?: string;
        requiresManagerPin: boolean;
        managerName?: string;
        warnings: string[];
        onVerify: (pin: string) => Promise<{ success: boolean; error?: string }>;
        onSuccess?: () => void;
    }>({
        open: false,
        action: "EDIT_ORDER",
        actionDescription: "",
        requiresManagerPin: false,
        warnings: [],
        onVerify: async () => ({ success: false }),
    });

    const requestPin = useCallback((config: {
        action: PinAction;
        actionDescription: string;
        targetDescription?: string;
        requiresManagerPin?: boolean;
        managerName?: string;
        warnings?: string[];
        onVerify: (pin: string) => Promise<{ success: boolean; error?: string }>;
        onSuccess?: () => void;
    }) => {
        setModalState({
            open: true,
            action: config.action,
            actionDescription: config.actionDescription,
            targetDescription: config.targetDescription,
            requiresManagerPin: config.requiresManagerPin ?? false,
            managerName: config.managerName,
            warnings: config.warnings ?? [],
            onVerify: config.onVerify,
            onSuccess: config.onSuccess,
        });
    }, []);

    const closeModal = useCallback(() => {
        setModalState((prev) => ({ ...prev, open: false }));
    }, []);

    const PinModal = useCallback(() => (
        <PinEntryModal
            open={modalState.open}
            onOpenChange={(open) => setModalState((prev) => ({ ...prev, open }))}
            action={modalState.action}
            actionDescription={modalState.actionDescription}
            targetDescription={modalState.targetDescription}
            requiresManagerPin={modalState.requiresManagerPin}
            managerName={modalState.managerName}
            warnings={modalState.warnings}
            onVerify={modalState.onVerify}
            onSuccess={modalState.onSuccess}
        />
    ), [modalState]);

    return {
        requestPin,
        closeModal,
        PinModal,
        isOpen: modalState.open,
    };
}

export default PinEntryModal;
