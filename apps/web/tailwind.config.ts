import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // ==========================================
        // USER PORTAL (Employers & Individuals)
        // Primary: Blue — trust, professionalism
        // ==========================================
        user: {
          primary: {
            DEFAULT: '#2563EB',
            dark: '#1D4ED8',
            light: '#DBEAFE',
            50: '#EFF6FF',
            100: '#DBEAFE',
            200: '#BFDBFE',
            300: '#93C5FD',
            400: '#60A5FA',
            500: '#2563EB',
            600: '#1D4ED8',
            700: '#1E40AF',
            800: '#1E3A8A',
            900: '#172554',
          },
          accent: {
            DEFAULT: '#0D9488',
            light: '#CCFBF1',
            dark: '#0F766E',
          },
        },

        // ==========================================
        // VENDOR PORTAL (Training Providers)
        // Primary: Violet — business dashboard feel
        // ==========================================
        vendor: {
          primary: {
            DEFAULT: '#7C3AED',
            dark: '#6D28D9',
            light: '#EDE9FE',
            50: '#F5F3FF',
            100: '#EDE9FE',
            200: '#DDD6FE',
            300: '#C4B5FD',
            400: '#A78BFA',
            500: '#7C3AED',
            600: '#6D28D9',
            700: '#5B21B6',
            800: '#4C1D95',
            900: '#2E1065',
          },
          accent: {
            DEFAULT: '#F59E0B',
            light: '#FEF3C7',
            dark: '#D97706',
          },
        },

        // ==========================================
        // ADMIN PORTAL (SuperAdmin)
        // Primary: Dark Slate — authority, control
        // ==========================================
        admin: {
          primary: {
            DEFAULT: '#0F172A',
            light: '#1E293B',
            lighter: '#334155',
          },
          sidebar: '#1E293B',
          accent: {
            DEFAULT: '#10B981',
            light: '#D1FAE5',
            dark: '#059669',
          },
          danger: {
            DEFAULT: '#EF4444',
            light: '#FEE2E2',
            dark: '#DC2626',
          },
          warning: {
            DEFAULT: '#F59E0B',
            light: '#FEF3C7',
            dark: '#D97706',
          },
        },

        // ==========================================
        // SHARED NEUTRALS (all portals)
        // ==========================================
        background: {
          DEFAULT: '#F8FAFC',
          paper: '#FFFFFF',
          subtle: '#F1F5F9',
        },
        foreground: {
          DEFAULT: '#1E293B',
          muted: '#64748B',
          subtle: '#94A3B8',
        },
        border: {
          DEFAULT: '#E2E8F0',
          dark: '#CBD5E1',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
      },
    },
  },
  plugins: [],
};

export default config;
