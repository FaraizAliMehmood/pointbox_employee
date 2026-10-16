/**
 * API Configuration
 * Centralized configuration for API base URL
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const API_ENDPOINTS = {
  EMPLOYEE: {
    BASE: '/employee',
    AUTH: {
      LOGIN: '/employee/login',
      CHECK_EMAIL: '/employee/check-email',
      VERIFY_OTP: '/employee/verify-otp',
      CHANGE_PASSWORD_WITH_OTP: '/employee/change-password',
    },
    CUSTOMER: {
      VERIFY: '/employee/verify-customer',
      BASE: '/employee/customers',
      BY_ID: (id: string) => `/employee/customers/${id}`,
    },
    POINTS: {
      ADD: '/employee/add-points',
      HISTORY: '/employee/redeem-history',
    },
    INVOICE: {
      SCAN: '/employee/scan-invoice',
    },
    PROFILE: {
      UPDATE_PASSWORD: '/employee/update-password',
    },
    FCM: {
      TOKEN: '/employee/fcm-token',
    },
    BANNERS: {
      BASE: '/employee/banners',
      BY_ID: (id: string) => `/employee/banners/${id}`,
    },
    PRODUCTS: {
      BASE: '/employee/products',
      BY_ID: (id: string) => `/employee/products/${id}`,
    },
    QUERIES: {
      BASE: '/employee/queries',
      RESPOND: (id: string) => `/employee/queries/${id}/respond`,
    },
    NOTIFICATIONS: {
      BASE: '/employee/notifications',
    },
  },
} as const;

