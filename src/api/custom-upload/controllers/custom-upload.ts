// Custom upload controller that uses Firebase authentication
export default {
  async upload(ctx) {
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
    const fileInfo = ctx.request.body?.fileInfo;
    let parsedFileInfo;

    try {
      parsedFileInfo = typeof fileInfo === "string" ? JSON.parse(fileInfo) : fileInfo;
    } catch {
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
