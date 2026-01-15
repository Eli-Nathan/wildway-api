/**
 * Middleware to transform Strapi 5 responses to Strapi 4 format
 * This provides backwards compatibility for existing clients expecting the old format
 *
 * Strapi 5 format: { data: [{ id, documentId, title, ... }] }
 * Strapi 4 format: { data: [{ id, attributes: { title, ... } }] }
 */

interface StrapiContext {
  request: {
    path: string;
  };
  response: {
    body: unknown;
  };
}

const EXCLUDED_PATHS = ["/admin", "/_health", "/upload"];

const isApiPath = (path: string): boolean => {
  return (
    path.startsWith("/api/") &&
    !EXCLUDED_PATHS.some((excluded) => path.startsWith(excluded))
  );
};

const transformToStrapi4Format = (data: unknown): unknown => {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => transformSingleItem(item));
  }

  return transformSingleItem(data);
};

/**
 * Transform nested object fields (for components and relations)
 * This handles relations inside components that need { data: {...} } wrapping
 */
const transformNestedFields = (obj: Record<string, unknown>): Record<string, unknown> => {
  const transformed: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === "object") {
      if (Array.isArray(value)) {
        // Array: check if it's an array of entities or components
        if (value.length > 0 && typeof value[0] === "object" && value[0] !== null) {
          if ("id" in value[0]) {
            // Array of entities - transform each item
            transformed[key] = value.map((v) => transformSingleItem(v));
          } else {
            // Array of components or primitives - recursively transform
            transformed[key] = value.map((v) =>
              typeof v === "object" && v !== null
                ? transformNestedFields(v as Record<string, unknown>)
                : v
            );
          }
        } else {
          transformed[key] = value;
        }
      } else if ("id" in (value as Record<string, unknown>)) {
        // Single relation (has id): wrap in { data: {...} }
        transformed[key] = {
          data: transformSingleItem(value),
        };
      } else {
        // Component (no id): recursively transform its fields for nested relations
        transformed[key] = transformNestedFields(value as Record<string, unknown>);
      }
    } else {
      transformed[key] = value;
    }
  }

  return transformed;
};

const transformSingleItem = (item: unknown): unknown => {
  if (item === null || item === undefined || typeof item !== "object") {
    return item;
  }

  const obj = item as Record<string, unknown>;

  // If it already has attributes, it's already in v4 format
  if ("attributes" in obj) {
    return obj;
  }

  // If it doesn't have an id, it's a component - transform its nested fields
  if (!("id" in obj)) {
    return transformNestedFields(obj);
  }

  // Extract id and documentId, put everything else in attributes
  const { id, documentId, ...attributes } = obj;

  // Transform nested fields (handles both relations and components)
  const transformedAttributes = transformNestedFields(attributes);

  return {
    id,
    attributes: transformedAttributes,
  };
};

export default () => {
  return async (ctx: StrapiContext, next: () => Promise<void>) => {
    await next();

    // Only transform API responses
    if (!isApiPath(ctx.request.path)) {
      return;
    }

    const body = ctx.response.body as Record<string, unknown> | null;

    // Only transform responses with data property
    if (!body || typeof body !== "object" || !("data" in body)) {
      return;
    }

    // Transform the data
    ctx.response.body = {
      ...body,
      data: transformToStrapi4Format(body.data),
    };
  };
};
