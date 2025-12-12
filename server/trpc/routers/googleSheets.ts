import { router, protectedProcedure } from "@/server/trpc/trpc";
import { z } from "zod";

export const googleSheetsRouter = router({
  // Save Apps Script URL for an outlet
  saveAppsScriptUrl: protectedProcedure
    .input(z.object({
      outletId: z.string(),
      appsScriptUrl: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { GoogleSheetsService } = await import("../../services/google-sheets.service");
      // Use logic to verify tenant access inside the service or keep concise check here
      // For now, simple auth is moved to Service but we can keep basic checks if preferred.
      // Actually Service handles detailed checks better.
      // But let's check tenant here for safety or let Service handle it.
      // The Service I wrote takes `tenantId` as params to verify.

      // Wait, Service `saveUrl` I wrote was simple update. 
      // Let's rely on standard practice: Router checks permissions, Service executes.
      // But for `exportMonthlyReport` and `generateScript`, I moved FULL logic including checks. 

      const outlet = await ctx.prisma.outlet.findUnique({
        where: { id: input.outletId },
        select: { tenantId: true }
      });
      if (!outlet || outlet.tenantId !== ctx.tenantId) {
        throw new Error("FORBIDDEN"); // Or TRPCError
      }

      await GoogleSheetsService.saveUrl(ctx.prisma, input.outletId, input.appsScriptUrl);
      return { success: true };
    }),

  // Get Apps Script URL for an outlet
  getAppsScriptUrl: protectedProcedure
    .input(z.object({
      outletId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const { GoogleSheetsService } = await import("../../services/google-sheets.service");

      const outlet = await ctx.prisma.outlet.findUnique({
        where: { id: input.outletId },
        select: { tenantId: true }
      });
      if (!outlet || outlet.tenantId !== ctx.tenantId) {
        throw new Error("FORBIDDEN");
      }

      const url = await GoogleSheetsService.getUrl(ctx.prisma, input.outletId);
      return { appsScriptUrl: url };
    }),

  // Export monthly report to Google Sheets via Apps Script
  exportMonthlyReport: protectedProcedure
    .input(z.object({
      outletId: z.string(),
      year: z.number(),
      month: z.number().min(1).max(12),
    }))
    .mutation(async ({ ctx, input }) => {
      const { GoogleSheetsService } = await import("../../services/google-sheets.service");
      return GoogleSheetsService.exportMonthlyReport(ctx.prisma, {
        ...input,
        tenantId: ctx.tenantId
      });
    }),

  // Generate customized Apps Script code for an outlet
  generateScript: protectedProcedure
    .input(z.object({
      outletId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const { GoogleSheetsService } = await import("../../services/google-sheets.service");
      return GoogleSheetsService.generateScript(ctx.prisma, {
        outletId: input.outletId,
        tenantId: ctx.tenantId
      });
    }),
});
