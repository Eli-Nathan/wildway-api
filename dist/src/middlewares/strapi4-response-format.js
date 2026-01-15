"use strict";
/**
 * Middleware to transform Strapi 5 responses to Strapi 4 format
 * This provides backwards compatibility for existing clients expecting the old format
 *
 * Strapi 5 format: { data: [{ id, documentId, title, ... }] }
 * Strapi 4 format: { data: [{ id, attributes: { title, ... } }] }
 */
Object.defineProperty(exports, "__esModule", { value: true });
const EXCLUDED_PATHS = ["/admin", "/_health", "/upload"];
const isApiPath = (path) => {
    return (path.startsWith("/api/") &&
        !EXCLUDED_PATHS.some((excluded) => path.startsWith(excluded)));
};
const transformToStrapi4Format = (data) => {
    if (data === null || data === undefined) {
        return data;
    }
    if (Array.isArray(data)) {
        return data.map((item) => transformSingleItem(item));
    }
    return transformSingleItem(data);
};
/**
 * Check if an object is a Strapi entity (relation) vs a component
 * In Strapi 5:
 * - Entities/Relations have both `id` AND `documentId`
 * - Components have `id` but NO `documentId`
 */
const isEntity = (obj) => {
    return "id" in obj && "documentId" in obj;
};
/**
 * Check if an object is a Strapi 5 component (has id but no documentId)
 */
const isComponent = (obj) => {
    return "id" in obj && !("documentId" in obj);
};
/**
 * Transform nested object fields (for components and relations)
 * This handles relations inside components that need { data: {...} } wrapping
 */
const transformNestedFields = (obj) => {
    const transformed = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value && typeof value === "object") {
            if (Array.isArray(value)) {
                // Array: check if it's an array of entities or components
                if (value.length > 0 && typeof value[0] === "object" && value[0] !== null) {
                    const firstItem = value[0];
                    if (isEntity(firstItem)) {
                        // Array of entities - wrap in { data: [...] } for sanitizeApiResponse
                        transformed[key] = {
                            data: value.map((v) => transformSingleItem(v)),
                        };
                    }
                    else if (isComponent(firstItem)) {
                        // Array of components - transform their nested fields but don't wrap
                        transformed[key] = value.map((v) => transformComponentFields(v));
                    }
                    else {
                        // Array of other objects - recursively transform
                        transformed[key] = value.map((v) => typeof v === "object" && v !== null
                            ? transformNestedFields(v)
                            : v);
                    }
                }
                else {
                    transformed[key] = value;
                }
            }
            else if (isEntity(value)) {
                // Entity/Relation (has id AND documentId): wrap in { data: {...} }
                transformed[key] = {
                    data: transformSingleItem(value),
                };
            }
            else if (isComponent(value)) {
                // Component (has id but no documentId): transform nested fields but DON'T wrap in { data }
                transformed[key] = transformComponentFields(value);
            }
            else {
                // Other object (no id): recursively transform its fields
                transformed[key] = transformNestedFields(value);
            }
        }
        else {
            transformed[key] = value;
        }
    }
    return transformed;
};
/**
 * Transform a component's fields - similar to transformNestedFields but preserves component structure
 * Components in Strapi 5 have an `id` but should NOT be wrapped in { data: { id, attributes } }
 */
const transformComponentFields = (component) => {
    const transformed = {};
    for (const [key, value] of Object.entries(component)) {
        if (key === "id") {
            // Keep component id as-is (frontend might use it)
            transformed[key] = value;
        }
        else if (value && typeof value === "object") {
            if (Array.isArray(value)) {
                if (value.length > 0 && typeof value[0] === "object" && value[0] !== null) {
                    const firstItem = value[0];
                    if (isEntity(firstItem)) {
                        // Array of entities - wrap in { data: [...] } for sanitizeApiResponse
                        transformed[key] = {
                            data: value.map((v) => transformSingleItem(v)),
                        };
                    }
                    else if (isComponent(firstItem)) {
                        transformed[key] = value.map((v) => transformComponentFields(v));
                    }
                    else {
                        transformed[key] = value.map((v) => typeof v === "object" && v !== null
                            ? transformNestedFields(v)
                            : v);
                    }
                }
                else {
                    transformed[key] = value;
                }
            }
            else if (isEntity(value)) {
                // Relation inside component: wrap in { data: {...} }
                transformed[key] = {
                    data: transformSingleItem(value),
                };
            }
            else if (isComponent(value)) {
                // Nested component: transform but don't wrap
                transformed[key] = transformComponentFields(value);
            }
            else {
                transformed[key] = transformNestedFields(value);
            }
        }
        else {
            transformed[key] = value;
        }
    }
    return transformed;
};
const transformSingleItem = (item) => {
    if (item === null || item === undefined || typeof item !== "object") {
        return item;
    }
    const obj = item;
    // If it already has attributes, it's already in v4 format
    if ("attributes" in obj) {
        return obj;
    }
    // If it's a component (has id but no documentId), transform its fields but don't wrap
    if (isComponent(obj)) {
        return transformComponentFields(obj);
    }
    // If it doesn't have an id at all, just transform nested fields
    if (!("id" in obj)) {
        return transformNestedFields(obj);
    }
    // It's an entity (has id, and either has documentId or we treat it as entity)
    // Extract id and documentId, put everything else in attributes
    const { id, documentId, ...attributes } = obj;
    // Transform nested fields (handles both relations and components)
    const transformedAttributes = transformNestedFields(attributes);
    return {
        id,
        attributes: transformedAttributes,
    };
};
exports.default = () => {
    return async (ctx, next) => {
        await next();
        // Only transform API responses
        if (!isApiPath(ctx.request.path)) {
            return;
        }
        const body = ctx.response.body;
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
