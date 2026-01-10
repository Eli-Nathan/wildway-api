"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const setOwner = async (ctx, _config, _context) => {
    if (ctx.state.user && ctx.state.user.id) {
        if (!ctx.request.body) {
            ctx.request.body = {};
        }
        if (!ctx.request.body.data) {
            ctx.request.body.data = {};
        }
        ctx.request.body.data.owner = ctx.state.user.id;
        return true;
    }
    return false;
};
exports.default = setOwner;
