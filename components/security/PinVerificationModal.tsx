"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PinInput } from "./PinInput";
import { Shield, AlertTriangle, CheckCircle2, Clock, Bell } from "lucide-react";
import { trpc } from "@/lib/trpc";

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

interface PinVerificationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    action: PinAction;
    actionDescription: string;
    targetDescription?: string;
    requiresManagerPin?: boolean;
    managerName?: string;
    onSuccess: (pin: string) => void;
    warnings?: string[];
}

const ACTION_LABELS: Record<PinAction, string> = {
    EDIT_ORDER: "Edit Order",
    VOID_ORDER: "Void Order",
    WITHDRAWAL: "Cash Withdrawal",
    PRICE_OVERRIDE: "Price Override",
    STOCK_ADJUSTMENT: "Stock Adjustment",
    REFUND: "Process Refund",
    MODIFY_CLOSING: "Modify Daily Closing",
    SUPPLIER_PAYMENT: "Supplier Payment",
    MANUAL_DISCOUNT: "Manual Discount",
};

export function PinVerificationModal({
    open,
    onOpenChange,
    action,
    actionDescription,
    targetDescription,
    requiresManagerPin = false,
    managerName,
    onSuccess,
    warnings = [],
}: PinVerificationModalProps) {
    const [pin, setPin] = useState<string[]>(["", "", "", ""]);
    const [error, setError] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [success, setSuccess] = useState(false);
    const [lockoutUntil, setLockoutUntil] = useState<Date | null>(null);
    const [countdown, setCountdown] = useState<number>(0);

    const verifyPinMutation = trpc.security.verifyPin.useMutation();

    // Reset state when modal opens/closes
    useEffect(() => {
        if (open) {
            setPin(["", "", "", ""]);
            setError(null);
            setSuccess(false);
            setIsVerifying(false);
        }
    }, [open]);

    // Countdown timer for lockout
    useEffect(() => {
        if (!lockoutUntil) {
            setCountdown(0);
            return;
        }

        const timer = setInterval(() => {
            const now = new Date().getTime();
            const until = lockoutUntil.getTime();
            const remaining = Math.max(0, Math.ceil((until - now) / 1000));

            setCountdown(remaining);

            if (remaining === 0) {
                setLockoutUntil(null);
                setError(null);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [lockoutUntil]);

    // Auto-submit when all 4 digits entered
    useEffect(() => {
        if (pin.every((digit) => digit !== "") && !isVerifying && !lockoutUntil) {
            handleVerify();
        }
    }, [pin]);

    const handleVerify = async () => {
        const pinValue = pin.join("");
        if (pinValue.length !== 4) {
            setError("Please enter all 4 digits");
            return;
        }

        setIsVerifying(true);
        setError(null);

        try {
            const result = await verifyPinMutation.mutateAsync({
                pin: pinValue,
                action,
            });

            if (result.success) {
                setSuccess(true);
                setError(null);

                // Show success briefly before closing
                setTimeout(() => {
                    onSuccess(pinValue);
                    onOpenChange(false);
                }, 800);
            } else {
                // Failed verification
                if (result.locked && result.lockedUntil) {
                    setLockoutUntil(new Date(result.lockedUntil));
                    setError(
                        `Account locked. Too many failed attempts. Please wait ${result.remainingMinutes} minutes.`
                    );
                } else {
                    setError(
                        result.error ||
                            `Invalid PIN. ${result.remainingAttempts} attempt${
                                result.remainingAttempts !== 1 ? "s" : ""
                            } remaining.`
                    );
                }
                setPin(["", "", "", ""]);
                setSuccess(false);
            }
        } catch (err: any) {
            setError(err.message || "Failed to verify PIN. Please try again.");
            setPin(["", "", "", ""]);
            setSuccess(false);
        } finally {
            setIsVerifying(false);
        }
    };

    const formatCountdown = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const isLocked = !!lockoutUntil && countdown > 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div
                            className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center",
                                success
                                    ? "bg-green-100"
                                    : isLocked
                                    ? "bg-red-100"
                                    : "bg-primary/10"
                            )}
                        >
                            {success ? (
                                <CheckCircle2 className="w-6 h-6 text-green-600" />
                            ) : isLocked ? (
                                <Clock className="w-6 h-6 text-red-600" />
                            ) : (
                                <Shield className="w-6 h-6 text-primary" />
                            )}
                        </div>
                        <div className="flex-1">
                            <DialogTitle className="text-xl">
                                {success
                                    ? "PIN Verified"
                                    : isLocked
                                    ? "Account Locked"
                                    : "PIN Verification Required"}
                            </DialogTitle>
                            <DialogDescription className="text-sm">
                                {success
                                    ? "Access granted"
                                    : requiresManagerPin
                                    ? `Manager PIN required for ${ACTION_LABELS[action]}`
                                    : `Enter your PIN to ${ACTION_LABELS[action].toLowerCase()}`}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Action Description */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <p className="text-sm font-medium text-gray-700 mb-1">Action:</p>
                        <p className="text-base font-semibold text-gray-900">{actionDescription}</p>
                        {targetDescription && (
                            <p className="text-sm text-gray-600 mt-1">{targetDescription}</p>
                        )}
                    </div>

                    {/* Manager Notification Badge */}
                    {requiresManagerPin && managerName && (
                        <Alert className="border-amber-200 bg-amber-50">
                            <Bell className="h-4 w-4 text-amber-600" />
                            <AlertDescription className="text-amber-800">
                                Manager <strong>{managerName}</strong> will be notified of this action
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Warnings */}
                    {warnings.length > 0 && (
                        <Alert variant="destructive" className="border-red-200 bg-red-50">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                <ul className="list-disc list-inside space-y-1">
                                    {warnings.map((warning, idx) => (
                                        <li key={idx} className="text-sm">
                                            {warning}
                                        </li>
                                    ))}
                                </AlertDescription>
                        </Alert>
                    )}

                    {/* PIN Input */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700 block text-center">
                            {isLocked ? "Account Locked" : "Enter 4-Digit PIN"}
                        </label>

                        <PinInput
                            value={pin}
                            onChange={setPin}
                            error={!!error && !success}
                            success={success}
                            disabled={isVerifying || isLocked}
                            autoFocus={!isLocked}
                        />

                        {/* Lockout Countdown */}
                        {isLocked && (
                            <div className="text-center">
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 rounded-lg border border-red-200">
                                    <Clock className="w-4 h-4 text-red-600" />
                                    <span className="text-sm font-medium text-red-700">
                                        Locked for {formatCountdown(countdown)}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Error Message */}
                        {error && !isLocked && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {/* Verifying State */}
                        {isVerifying && (
                            <p className="text-center text-sm text-gray-600">Verifying PIN...</p>
                        )}

                        {/* Success State */}
                        {success && (
                            <Alert className="border-green-200 bg-green-50">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-800">
                                    PIN verified successfully!
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>

                    {/* Cancel Button */}
                    <div className="flex justify-end pt-2">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isVerifying}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function cn(...classes: (string | boolean | undefined)[]) {
    return classes.filter(Boolean).join(" ");
}
