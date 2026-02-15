"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const netlifyRebuild_1 = require("../../../../nomad/netlifyRebuild");
exports.default = {
    async afterCreate() {
        await (0, netlifyRebuild_1.triggerNetlifyRebuild)("site-list");
    },
    async afterUpdate() {
        await (0, netlifyRebuild_1.triggerNetlifyRebuild)("site-list");
    },
    async afterDelete() {
        await (0, netlifyRebuild_1.triggerNetlifyRebuild)("site-list");
    },
};
