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
const transformSingleItem = (item) => {
    if (item === null || item === undefined || typeof item !== "object") {
        return item;
    }
    const obj = item;
    // If it already has attributes, it's already in v4 format
    if ("attributes" in obj) {
        return obj;
    }
    // If it doesn't have an id, it's not a Strapi entity
    if (!("id" in obj)) {
        return obj;
    }
    // Extract id and documentId, put everything else in attributes
    const { id, documentId, ...attributes } = obj;
    // Recursively transform nested relations
    // NOTE: Only wrap SINGLE relations in { data: {...} }
    // Array relations stay flat - frontend sanitizeApiResponse only unwraps top-level
    const transformedAttributes = {};
    for (const [key, value] of Object.entries(attributes)) {
        if (value && typeof value === "object") {
            if (Array.isArray(value)) {
                // Array relations: transform items but keep as flat array (no { data: [...] } wrapper)
                if (value.length > 0 && typeof value[0] === "object" && value[0] !== null && "id" in value[0]) {
                    transformedAttributes[key] = value.map((v) => transformSingleItem(v));
                }
                else {
                    transformedAttributes[key] = value;
                }
            }
            else if ("id" in value) {
                // Single relation: wrap in { data: {...} } for sanitizeApiResponse compatibility
                transformedAttributes[key] = {
                    data: transformSingleItem(value),
                };
            }
            else {
                transformedAttributes[key] = value;
            }
        }
        else {
            transformedAttributes[key] = value;
        }
    }
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
