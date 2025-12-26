import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

export const tenantRouter = router({
  // Get tenant settings (expense categories, etc.)
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    const { tenantId } = ctx;

    if (!tenantId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'No tenant found',
      });
    }

    const tenant = await ctx.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        primaryColor: true,
        expenseCategories: true,
        fruitCategories: true,
      },
    });

    if (!tenant) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Tenant not found',
      });
    }

    return {
      ...tenant,
      expenseCategories: (tenant.expenseCategories as string[]) || [
        'Rent',
        'Staff Salary',
        'Bake',
        'Fruits',
        'Packaging',
        'Fuel',
        'Utilities',
        'Marketing',
        'Maintenance',
        'Other',
      ],
      fruitCategories: (tenant.fruitCategories as string[]) || [
        'Kiwi',
        'Strawberry',
        'Mango',
        'Banana',
        'Apple',
      ],
    };
  }),

  // Update tenant profile (brand settings)
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        currency: z.string().optional(),
        primaryColor: z.string().optional(),
        logoUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { tenantId, role } = ctx;

      if (!tenantId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'No tenant found',
        });
      }

      // Only BRAND_ADMIN and SUPER can update profile settings
      if (role !== 'BRAND_ADMIN' && role !== 'SUPER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions to update brand profile',
        });
      }

      return ctx.prisma.tenant.update({
        where: { id: tenantId },
        data: input,
        select: {
          id: true,
          name: true,
          currency: true,
          primaryColor: true,
          logoUrl: true,
        },
      });
    }),


  // Update tenant settings (categories)
  updateSettings: protectedProcedure
    .input(
      z.object({
        expenseCategories: z.array(z.string()).optional(),
        fruitCategories: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { tenantId, role } = ctx;

      if (!tenantId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'No tenant found',
        });
      }

      // Allow BRAND_ADMIN, SUPER, and OUTLET_MANAGER to update settings
      if (role !== 'BRAND_ADMIN' && role !== 'SUPER' && role !== 'OUTLET_MANAGER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions to update settings',
        });
      }

      const updated = await ctx.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          expenseCategories: input.expenseCategories,
          fruitCategories: input.fruitCategories,
        },
        select: {
          id: true,
          expenseCategories: true,
          fruitCategories: true,
        },
      });

      return updated;
    }),

});
