"use client";

import { useState, useCallback } from "react";
import { PinVerificationModal, PinAction } from "@/components/security/PinVerificationModal";

interface PinVerificationOptions {
    action: PinAction;
    actionDescription: string;
    targetDescription?: string;
    requiresManagerPin?: boolean;
    managerName?: string;
    warnings?: string[];
    onSuccess: (pin: string) => void | Promise<void>;
}

export function usePinVerification() {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<PinVerificationOptions | null>(null);

    const requestPin = useCallback((opts: PinVerificationOptions) => {
        setOptions(opts);
        setIsOpen(true);
    }, []);

    const closeModal = useCallback(() => {
        setIsOpen(false);
        setOptions(null);
    }, []);

    const handleSuccess = useCallback(
        async (pin: string) => {
            if (options?.onSuccess) {
                await options.onSuccess(pin);
            }
            closeModal();
        },
        [options, closeModal]
    );

    const PinModal = options ? (
        <PinVerificationModal
            open={isOpen}
            onOpenChange={setIsOpen}
            action={options.action}
            actionDescription={options.actionDescription}
            targetDescription={options.targetDescription}
            requiresManagerPin={options.requiresManagerPin}
            managerName={options.managerName}
            warnings={options.warnings}
            onSuccess={handleSuccess}
        />
    ) : null;

    return {
        requestPin,
        closeModal,
        PinModal,
        isOpen,
    };
}
