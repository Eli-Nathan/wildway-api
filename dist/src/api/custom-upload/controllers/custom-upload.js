"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Custom upload controller that uses Firebase authentication
const auth_1 = require("firebase-admin/auth");
exports.default = {
    async upload(ctx) {
        var _a, _b, _c, _d, _e;
        // Verify Firebase token directly in controller
        const authHeader = (_b = (_a = ctx.request) === null || _a === void 0 ? void 0 : _a.header) === null || _b === void 0 ? void 0 : _b.authorization;
        strapi.log.info("custom-upload: authHeader exists =", !!authHeader);
        if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith("Bearer "))) {
            return ctx.unauthorized("Missing or invalid credentials");
        }
        try {
            const token = authHeader.replace("Bearer ", "");
            const userData = await (0, auth_1.getAuth)().verifyIdToken(token);
            strapi.log.info("custom-upload: Token verified for user:", userData.email);
            // Find user in database
            const nomadUser = await strapi.db
                .query("api::auth-user.auth-user")
                .findOne({
                where: { user_id: userData.uid },
            });
            if (!nomadUser) {
                strapi.log.warn("custom-upload: User not found in DB for uid:", userData.uid);
                return ctx.unauthorized("User not found");
            }
            strapi.log.info("custom-upload: User verified:", nomadUser.email);
            // Store user info for later use in file upload
            ctx.state.nomadUser = nomadUser;
        }
        catch (error) {
            strapi.log.error("custom-upload: Auth error:", error);
            return ctx.unauthorized("Invalid token");
        }
        // Get the upload service
        const uploadService = strapi.plugin("upload").service("upload");
        // Get files from the request
        const { files } = ctx.request;
        strapi.log.info("custom-upload: files =", Object.keys(files || {}));
        if (!files || !files.files) {
            return ctx.badRequest("No files provided");
        }
        // Handle file info from request body
        const fileInfo = (_c = ctx.request.body) === null || _c === void 0 ? void 0 : _c.fileInfo;
        let parsedFileInfo;
        try {
            parsedFileInfo = typeof fileInfo === "string" ? JSON.parse(fileInfo) : fileInfo;
        }
        catch {
            parsedFileInfo = {};
        }
        // Set the uploader's name as the caption
        const uploaderName = ((_d = ctx.state.nomadUser) === null || _d === void 0 ? void 0 : _d.name) || ((_e = ctx.state.nomadUser) === null || _e === void 0 ? void 0 : _e.email);
        if (uploaderName) {
            parsedFileInfo = { ...parsedFileInfo, caption: `Photo by ${uploaderName}` };
        }
        strapi.log.info("custom-upload: parsedFileInfo =", JSON.stringify(parsedFileInfo));
        strapi.log.info("custom-upload: uploaderName =", uploaderName);
        // Upload the files
        const uploadedFiles = await uploadService.upload({
            data: parsedFileInfo,
            files: files.files,
        });
        // Update each uploaded file with the caption directly in case upload service didn't apply it
        if (uploadedFiles && uploadedFiles.length > 0 && uploaderName) {
            const caption = `Photo by ${uploaderName}`;
            for (const file of uploadedFiles) {
                if (!file.caption) {
                    strapi.log.info("custom-upload: Updating file caption for id:", file.id);
                    await strapi.db.query("plugin::upload.file").update({
                        where: { id: file.id },
                        data: { caption },
                    });
                    file.caption = caption;
                }
            }
        }
        ctx.body = uploadedFiles;
    },
};
