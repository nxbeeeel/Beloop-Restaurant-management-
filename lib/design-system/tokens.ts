/**
 * Design Tokens - Single Source of Truth
 *
 * World-class design system inspired by:
 * - Stripe
 * - Vercel
 * - Linear
 * - Radix UI
 */

export const designTokens = {
  // ============================================
  // COLORS - Semantic & Accessible
  // ============================================
  colors: {
    // Primary Brand Color (Rose/Red for restaurant theme)
    primary: {
      50: 'hsl(355, 100%, 97%)',
      100: 'hsl(355, 100%, 95%)',
      200: 'hsl(353, 96%, 90%)',
      300: 'hsl(353, 96%, 82%)',
      400: 'hsl(351, 95%, 71%)',
      500: 'hsl(349, 89%, 60%)',   // Main brand color
      600: 'hsl(347, 77%, 50%)',
      700: 'hsl(345, 83%, 41%)',
      800: 'hsl(343, 80%, 35%)',
      900: 'hsl(342, 76%, 30%)',
    },

    // Neutral/Gray Scale
    gray: {
      50: 'hsl(210, 20%, 98%)',
      100: 'hsl(220, 14%, 96%)',
      200: 'hsl(220, 13%, 91%)',
      300: 'hsl(216, 12%, 84%)',
      400: 'hsl(218, 11%, 65%)',
      500: 'hsl(220, 9%, 46%)',
      600: 'hsl(215, 14%, 34%)',
      700: 'hsl(217, 19%, 27%)',
      800: 'hsl(215, 28%, 17%)',
      900: 'hsl(221, 39%, 11%)',
    },

    // Semantic Colors
    success: {
      50: 'hsl(142, 76%, 96%)',
      100: 'hsl(142, 71%, 91%)',
      500: 'hsl(142, 71%, 45%)',
      600: 'hsl(142, 76%, 36%)',
      700: 'hsl(142, 77%, 30%)',
    },

    error: {
      50: 'hsl(0, 86%, 97%)',
      100: 'hsl(0, 93%, 94%)',
      500: 'hsl(0, 84%, 60%)',
      600: 'hsl(0, 72%, 51%)',
      700: 'hsl(0, 74%, 42%)',
    },

    warning: {
      50: 'hsl(38, 92%, 95%)',
      100: 'hsl(38, 92%, 90%)',
      500: 'hsl(38, 92%, 50%)',
      600: 'hsl(30, 92%, 45%)',
      700: 'hsl(26, 90%, 37%)',
    },

    info: {
      50: 'hsl(204, 100%, 97%)',
      100: 'hsl(204, 94%, 94%)',
      500: 'hsl(204, 94%, 54%)',
      600: 'hsl(204, 98%, 39%)',
      700: 'hsl(204, 100%, 29%)',
    },
  },

  // ============================================
  // SPACING - 4px base unit
  // ============================================
  spacing: {
    0: '0',
    0.5: '0.125rem',  // 2px
    1: '0.25rem',     // 4px
    1.5: '0.375rem',  // 6px
    2: '0.5rem',      // 8px
    2.5: '0.625rem',  // 10px
    3: '0.75rem',     // 12px
    3.5: '0.875rem',  // 14px
    4: '1rem',        // 16px
    5: '1.25rem',     // 20px
    6: '1.5rem',      // 24px
    7: '1.75rem',     // 28px
    8: '2rem',        // 32px
    9: '2.25rem',     // 36px
    10: '2.5rem',     // 40px
    12: '3rem',       // 48px
    14: '3.5rem',     // 56px
    16: '4rem',       // 64px
    20: '5rem',       // 80px
    24: '6rem',       // 96px
    32: '8rem',       // 128px
  },

  // ============================================
  // TYPOGRAPHY - Inter font system
  // ============================================
  typography: {
    fontFamily: {
      sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
    },

    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.025em' }],      // 12px
      sm: ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0' }],        // 14px
      base: ['1rem', { lineHeight: '1.5rem', letterSpacing: '0' }],           // 16px
      lg: ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],  // 18px
      xl: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],   // 20px
      '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.02em' }],    // 24px
      '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }], // 30px
      '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.03em' }],   // 36px
      '5xl': ['3rem', { lineHeight: '1', letterSpacing: '-0.03em' }],           // 48px
    },

    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },

  // ============================================
  // BORDER RADIUS - Smooth, modern
  // ============================================
  borderRadius: {
    none: '0',
    sm: '0.25rem',    // 4px
    DEFAULT: '0.375rem', // 6px
    md: '0.5rem',     // 8px
    lg: '0.75rem',    // 12px
    xl: '1rem',       // 16px
    '2xl': '1.5rem',  // 24px
    full: '9999px',
  },

  // ============================================
  // SHADOWS - Subtle depth
  // ============================================
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  },

  // ============================================
  // ANIMATION - Smooth, performant
  // ============================================
  animation: {
    duration: {
      fast: '150ms',
      base: '200ms',
      slow: '300ms',
      slower: '500ms',
    },

    easing: {
      linear: 'linear',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      // Custom easing for smooth feel
      smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
  },

  // ============================================
  // Z-INDEX - Layering system
  // ============================================
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },
} as const;

// Export for Tailwind CSS configuration
export const tailwindTokens = {
  theme: {
    extend: {
      colors: designTokens.colors,
      spacing: designTokens.spacing,
      fontFamily: designTokens.typography.fontFamily,
      fontSize: designTokens.typography.fontSize,
      fontWeight: designTokens.typography.fontWeight,
      borderRadius: designTokens.borderRadius,
      boxShadow: designTokens.shadows,
      transitionDuration: designTokens.animation.duration,
      transitionTimingFunction: designTokens.animation.easing,
      zIndex: designTokens.zIndex,
    },
  },
};
