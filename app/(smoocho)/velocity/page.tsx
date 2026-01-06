"use client";

import { redirect } from "next/navigation";

/**
 * SMOOCHO Velocity Main Page
 * Redirects to the register page for daily operations
 */
export default function VelocityPage() {
    redirect("/velocity/register");
}
