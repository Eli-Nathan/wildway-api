"use strict";
/**
 * Middleware to transform Strapi 4 query parameters to Strapi 5 format
 *
 * Changes:
 * - sort=field:direction -> { field: "direction" } (object format for db.query)
 * - Also sets ctx.query.sort for controllers that use it directly
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
        await next();
    };
};
