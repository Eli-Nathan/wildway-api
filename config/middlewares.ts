type MiddlewareConfig =
  | string
  | {
      name: string;
      config?: Record<string, unknown>;
    };

const middlewares: MiddlewareConfig[] = [
  "strapi::errors",
  // Transform Strapi 4 query params to Strapi 5 format (must be early)
  "global::strapi4-query-params",
  {
    name: "strapi::security",
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "connect-src": ["'self'", "https:"],
          "img-src": ["'self'", "data:", "blob:", "res.cloudinary.com"],
          "media-src": ["'self'", "data:", "blob:", "res.cloudinary.com"],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  "strapi::cors",
  "strapi::poweredBy",
  "strapi::logger",
  "strapi::query",
  {
    name: "strapi::body",
    config: {
      formLimit: "10mb",
      jsonLimit: "10mb",
      textLimit: "10mb",
    },
  },
  "strapi::session",
  "strapi::favicon",
  "strapi::public",
  // Firebase authentication middleware - runs on all API requests
  "global::firebase-auth",
  // Transform Strapi 5 responses to Strapi 4 format for backwards compatibility
  "global::strapi4-response-format",
];

export default middlewares;
