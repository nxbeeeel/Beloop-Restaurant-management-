"use client";

import { useRef, useEffect, KeyboardEvent, ClipboardEvent } from "react";
import { cn } from "@/lib/utils";

interface PinInputProps {
    value: string[];
    onChange: (value: string[]) => void;
    error?: boolean;
    success?: boolean;
    disabled?: boolean;
    autoFocus?: boolean;
}

export function PinInput({
    value,
    onChange,
    error = false,
    success = false,
    disabled = false,
    autoFocus = false,
}: PinInputProps) {
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (autoFocus && inputRefs.current[0] && !disabled) {
            inputRefs.current[0]?.focus();
        }
    }, [autoFocus, disabled]);

    const handleChange = (index: number, digit: string) => {
        // Only allow single digits
        if (digit && !/^\d$/.test(digit)) return;

        const newValue = [...value];
        newValue[index] = digit;
        onChange(newValue);

        // Auto-advance to next input
        if (digit && index < 3) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
        // Backspace - move to previous input if current is empty
        if (e.key === "Backspace") {
            if (!value[index] && index > 0) {
                inputRefs.current[index - 1]?.focus();
            } else {
                const newValue = [...value];
                newValue[index] = "";
                onChange(newValue);
            }
        }

        // Arrow keys navigation
        if (e.key === "ArrowLeft" && index > 0) {
            e.preventDefault();
            inputRefs.current[index - 1]?.focus();
        }

        if (e.key === "ArrowRight" && index < 3) {
            e.preventDefault();
            inputRefs.current[index + 1]?.focus();
        }

        // Home/End keys
        if (e.key === "Home") {
            e.preventDefault();
            inputRefs.current[0]?.focus();
        }

        if (e.key === "End") {
            e.preventDefault();
            inputRefs.current[3]?.focus();
        }
    };

    const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData("text");
        const digits = pastedData.replace(/\D/g, "").slice(0, 4).split("");

        if (digits.length === 4) {
            onChange(digits);
            // Focus last input after paste
            inputRefs.current[3]?.focus();
        }
    };

    return (
        <div className="flex gap-3 justify-center">
            {[0, 1, 2, 3].map((index) => (
                <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={1}
                    value={value[index] || ""}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    disabled={disabled}
                    className={cn(
                        "w-14 h-14 text-center text-2xl font-bold rounded-lg border-2 transition-all",
                        "focus:outline-none focus:ring-2 focus:ring-offset-2",
                        error && "border-red-500 bg-red-50 text-red-900 focus:ring-red-500",
                        success && "border-green-500 bg-green-50 text-green-900 focus:ring-green-500",
                        !error && !success && "border-gray-300 focus:border-primary focus:ring-primary",
                        disabled && "opacity-50 cursor-not-allowed bg-gray-100",
                        !disabled && !error && !success && "hover:border-gray-400"
                    )}
                    aria-label={`PIN digit ${index + 1}`}
                />
            ))}
        </div>
    );
}
