"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Custom upload controller that uses Firebase authentication
exports.default = {
    async upload(ctx) {
        var _a;
        // User is already verified by firebase-authed policy
        if (!ctx.state.user) {
            return ctx.unauthorized("You must be logged in to upload files");
        }
        // Get the upload service
        const uploadService = strapi.plugin("upload").service("upload");
        // Get files from the request
        const { files } = ctx.request;
        if (!files || !files.files) {
            return ctx.badRequest("No files provided");
        }
        // Handle file info from request body
        const fileInfo = (_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.fileInfo;
        let parsedFileInfo;
        try {
            parsedFileInfo = typeof fileInfo === "string" ? JSON.parse(fileInfo) : fileInfo;
        }
        catch {
            parsedFileInfo = {};
        }
        // Upload the files
        const uploadedFiles = await uploadService.upload({
            data: parsedFileInfo,
            files: files.files,
        });
        ctx.body = uploadedFiles;
    },
};
