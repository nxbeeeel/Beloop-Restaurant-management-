"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

// -----------------------------------------------------------------------------
// Primitives
// -----------------------------------------------------------------------------

export function FadeIn({ children, delay = 0, duration = 0.5, className = "" }: { children: ReactNode, delay?: number, duration?: number, className?: string }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration, delay, ease: "easeOut" }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

export function SlideIn({ children, direction = "up", delay = 0, duration = 0.5, className = "" }: { children: ReactNode, direction?: "up" | "down" | "left" | "right", delay?: number, duration?: number, className?: string }) {
    const variants = {
        hidden: {
            opacity: 0,
            y: direction === "up" ? 20 : direction === "down" ? -20 : 0,
            x: direction === "left" ? 20 : direction === "right" ? -20 : 0,
        },
        visible: {
            opacity: 1,
            y: 0,
            x: 0,
        },
    };

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={variants}
            transition={{ duration, delay, ease: "easeOut" }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

export function ScaleIn({ children, delay = 0, duration = 0.3, className = "" }: { children: ReactNode, delay?: number, duration?: number, className?: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration, delay, ease: "easeOut" }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// -----------------------------------------------------------------------------
// Page Transition Wrapper
// -----------------------------------------------------------------------------

export function PageTransition({ children, className = "" }: { children: ReactNode, className?: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// -----------------------------------------------------------------------------
// Staggered List Container
// -----------------------------------------------------------------------------

export function StaggerContainer({ children, staggerDelay = 0.1, className = "" }: { children: ReactNode, staggerDelay?: number, className?: string }) {
    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={{
                visible: {
                    transition: {
                        staggerChildren: staggerDelay,
                    },
                },
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

export function StaggerItem({ children, className = "" }: { children: ReactNode, className?: string }) {
    return (
        <motion.div
            variants={{
                hidden: { opacity: 0, y: 10 },
                visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.3 }}
            className={className}
        >
            {children}
        </motion.div>
    );
}
