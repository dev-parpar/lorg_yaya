// Base URL of the deployed Next.js API — override in .env for local dev
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export const ROUTES = {
  LOGIN: "/(auth)/login",
  REGISTER: "/(auth)/register",
  LOCATIONS: "/(tabs)/locations",
} as const;

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
} as const;
