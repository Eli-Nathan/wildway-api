"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureUniqueHandle = exports.checkHandleAvailable = exports.validateHandle = exports.generateHandle = void 0;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Filter = require("bad-words");
// Initialize profanity filter
const filter = new Filter();
// Reserved handles that cannot be used
const RESERVED_HANDLES = [
    "admin",
    "wildway",
    "support",
    "api",
    "www",
    "app",
    "help",
    "info",
    "team",
    "official",
    "staff",
    "moderator",
    "system",
    "root",
    "account",
    "settings",
    "profile",
    "user",
    "users",
    "login",
    "logout",
    "signup",
    "register",
    "password",
    "reset",
    "verify",
    "delete",
    "edit",
    "create",
    "update",
    "remove",
    "null",
    "undefined",
    "test",
];
/**
 * Generate base handle from name
 * - Convert to lowercase
 * - Replace spaces with underscores
 * - Remove special characters except underscores
 * - Trim to 20 characters max
 */
function generateHandle(name) {
    if (!name || typeof name !== "string") {
        return "user";
    }
    let handle = name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "")
        .substring(0, 20);
    // Ensure minimum length
    if (handle.length < 3) {
        handle = "user_" + handle;
    }
    return handle;
}
exports.generateHandle = generateHandle;
/**
 * Validate handle format and content
 * Returns { valid: boolean; error?: string }
 */
function validateHandle(handle) {
    if (!handle || typeof handle !== "string") {
        return { valid: false, error: "Handle is required" };
    }
    // Sanitize first
    const sanitized = handle.toLowerCase().trim();
    // Check length
    if (sanitized.length < 3) {
        return { valid: false, error: "Handle must be at least 3 characters" };
    }
    if (sanitized.length > 20) {
        return { valid: false, error: "Handle must be 20 characters or less" };
    }
    // Check format: only lowercase letters, numbers, and underscores
    if (!/^[a-z0-9_]+$/.test(sanitized)) {
        return {
            valid: false,
            error: "Handle can only contain lowercase letters, numbers, and underscores",
        };
    }
    // Cannot start or end with underscore
    if (sanitized.startsWith("_") || sanitized.endsWith("_")) {
        return {
            valid: false,
            error: "Handle cannot start or end with an underscore",
        };
    }
    // Cannot have consecutive underscores
    if (sanitized.includes("__")) {
        return {
            valid: false,
            error: "Handle cannot have consecutive underscores",
        };
    }
    // Check reserved words
    if (RESERVED_HANDLES.includes(sanitized)) {
        return { valid: false, error: "This handle is reserved and cannot be used" };
    }
    // Check profanity
    if (filter.isProfane(sanitized)) {
        return { valid: false, error: "This handle contains inappropriate language" };
    }
    return { valid: true };
}
exports.validateHandle = validateHandle;
/**
 * Check if handle is available (not taken by another user)
 */
async function checkHandleAvailable(handle, strapi, excludeUserId) {
    const where = { handle: handle.toLowerCase() };
    if (excludeUserId) {
        where.id = { $ne: excludeUserId };
    }
    const existingUser = await strapi.db
        .query("api::auth-user.auth-user")
        .findOne({ where });
    return !existingUser;
}
exports.checkHandleAvailable = checkHandleAvailable;
/**
 * Ensure handle is unique by adding numeric suffix if needed
 */
async function ensureUniqueHandle(baseHandle, strapi) {
    let handle = baseHandle;
    let suffix = 1;
    // Try the base handle first
    let isAvailable = await checkHandleAvailable(handle, strapi);
    while (!isAvailable && suffix < 10000) {
        // Truncate base to fit suffix within 20 char limit
        const maxBaseLength = 20 - String(suffix).length;
        const truncatedBase = baseHandle.substring(0, maxBaseLength);
        handle = `${truncatedBase}${suffix}`;
        suffix++;
        isAvailable = await checkHandleAvailable(handle, strapi);
    }
    // Fallback to random string if still not unique (very unlikely)
    if (!isAvailable) {
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        handle = `user_${randomSuffix}`;
    }
    return handle;
}
exports.ensureUniqueHandle = ensureUniqueHandle;
exports.default = {
    generateHandle,
    validateHandle,
    checkHandleAvailable,
    ensureUniqueHandle,
    RESERVED_HANDLES,
};
