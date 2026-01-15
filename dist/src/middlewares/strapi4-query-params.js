"use strict";
/**
 * Middleware to transform Strapi 4 query parameters to Strapi 5 format
 *
 * Changes:
 * - sort=field:direction -> { field: "direction" } (object format for db.query)
 * - populate[0]=field -> { field: true } (object format for populate)
 * - Also sets ctx.query.sort and ctx.query.populate for controllers that use them
 */
Object.defineProperty(exports, "__esModule", { value: true });
const EXCLUDED_PATHS = ["/admin", "/_health", "/upload"];
const isApiPath = (path) => {
    return (path.startsWith("/api/") &&
        !EXCLUDED_PATHS.some((excluded) => path.startsWith(excluded)));
};
/**
 * Transform sort parameter from Strapi 4 string format to object format
 * Strapi 4: sort=priority:DESC or sort[0]=priority:desc
 * Strapi 5 db.query: { priority: "desc" }
 */
const transformSortParam = (sort) => {
    if (!sort)
        return undefined;
    // If it's already an object with field keys (not array indices), return as-is
    if (typeof sort === "object" && !Array.isArray(sort)) {
        const keys = Object.keys(sort);
        // Check if it's an indexed object (like sort[0]=...) vs a proper sort object
        const isIndexedObject = keys.every((k) => !isNaN(Number(k)));
        if (!isIndexedObject) {
            return sort;
        }
        // It's an indexed object, convert to array and process
        const sortArray = [];
        const sortObj = sort;
        const sortedKeys = keys.sort((a, b) => Number(a) - Number(b));
        for (const key of sortedKeys) {
            sortArray.push(String(sortObj[key]));
        }
        return sortArray.map((s) => parseSortString(s));
    }
    // If it's an array, convert each item
    if (Array.isArray(sort)) {
        return sort.map((s) => parseSortString(String(s)));
    }
    // If it's a string (Strapi 4 format), parse it
    if (typeof sort === "string") {
        // Handle comma-separated sorts like "priority:desc,createdAt:desc"
        if (sort.includes(",")) {
            const sortItems = sort.split(",").map((s) => s.trim());
            return sortItems.map((s) => parseSortString(s));
        }
        return parseSortString(sort);
    }
    return undefined;
};
/**
 * Parse a single sort string into an object
 * "priority:DESC" -> { priority: "DESC" }
 * "priority" -> { priority: "asc" }
 */
const parseSortString = (item) => {
    if (!item.includes(":")) {
        return { [item]: "asc" }; // Default to ascending
    }
    const [field, direction] = item.split(":");
    const normalizedDirection = direction.toUpperCase();
    // Validate direction
    if (normalizedDirection !== "ASC" && normalizedDirection !== "DESC") {
        return { [field]: "asc" }; // Default to ascending for invalid direction
    }
    return { [field]: normalizedDirection };
};
/**
 * Transform populate parameter from Strapi 4 array format to Strapi 5 object format
 * Strapi 4: populate[0]=field, populate[1]=field.nested
 * Strapi 5: { field: { populate: { nested: true } } }
 */
const transformPopulateParam = (populate) => {
    if (!populate)
        return undefined;
    // If it's already an object (not array), it might already be in Strapi 5 format
    if (typeof populate === "object" && !Array.isArray(populate)) {
        const keys = Object.keys(populate);
        // Check if it's an indexed object (like populate[0]=...) vs a proper populate object
        const isIndexedObject = keys.every((k) => !isNaN(Number(k)));
        if (!isIndexedObject) {
            // Already in Strapi 5 format
            return populate;
        }
        // It's an indexed object, convert to array and process
        const populateArray = [];
        const populateObj = populate;
        const sortedKeys = keys.sort((a, b) => Number(a) - Number(b));
        for (const key of sortedKeys) {
            populateArray.push(String(populateObj[key]));
        }
        return convertPopulateArrayToObject(populateArray);
    }
    // If it's an array of strings
    if (Array.isArray(populate)) {
        return convertPopulateArrayToObject(populate.map(String));
    }
    // If it's a single string
    if (typeof populate === "string") {
        if (populate === "*") {
            // Strapi 5 doesn't support "*" the same way, return as-is and let Strapi handle it
            return undefined;
        }
        return convertPopulateArrayToObject([populate]);
    }
    return undefined;
};
/**
 * Convert an array of dot-notation paths to nested object format
 * ["type", "type.remote_icon", "comments.owner"] ->
 * { type: { populate: { remote_icon: true } }, comments: { populate: { owner: true } } }
 */
const convertPopulateArrayToObject = (paths) => {
    const result = {};
    for (const path of paths) {
        const parts = path.split(".");
        let current = result;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isLast = i === parts.length - 1;
            if (isLast) {
                // Last part - set to true or preserve existing nested structure
                if (!current[part]) {
                    current[part] = true;
                }
            }
            else {
                // Not last - ensure we have a nested populate object
                if (!current[part] || current[part] === true) {
                    current[part] = { populate: {} };
                }
                const nested = current[part];
                if (typeof nested === "object" && "populate" in nested) {
                    current = nested.populate;
                }
            }
        }
    }
    return result;
};
exports.default = () => {
    return async (ctx, next) => {
        // Only transform API requests
        if (!isApiPath(ctx.request.path)) {
            return await next();
        }
        // Transform sort parameter if present
        if (ctx.request.query.sort !== undefined) {
            const transformedSort = transformSortParam(ctx.request.query.sort);
            if (transformedSort) {
                ctx.request.query.sort = transformedSort;
                // Also set on ctx.query which is what controllers typically access
                if (ctx.query) {
                    ctx.query.sort = transformedSort;
                }
            }
        }
        // Transform populate parameter if present (Strapi 4 array -> Strapi 5 object)
        if (ctx.request.query.populate !== undefined) {
            const transformedPopulate = transformPopulateParam(ctx.request.query.populate);
            if (transformedPopulate) {
                ctx.request.query.populate = transformedPopulate;
                // Also set on ctx.query which is what controllers typically access
                if (ctx.query) {
                    ctx.query.populate = transformedPopulate;
                }
            }
        }
        await next();
    };
};
