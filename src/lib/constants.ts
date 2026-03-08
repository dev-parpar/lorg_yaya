export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

export const LOCATION_TYPES = ["HOME", "OFFICE"] as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const ROUTES = {
  LOGIN: "/login",
  REGISTER: "/register",
  LOCATIONS: "/locations",
  SEARCH: "/search",
} as const;
