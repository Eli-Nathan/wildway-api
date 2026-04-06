"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const netlifyRebuild_1 = require("../../../../wildway/netlifyRebuild");
exports.default = {
    async afterCreate() {
        await (0, netlifyRebuild_1.triggerNetlifyRebuild)("faq");
    },
    async afterUpdate() {
        await (0, netlifyRebuild_1.triggerNetlifyRebuild)("faq");
    },
    async afterDelete() {
        await (0, netlifyRebuild_1.triggerNetlifyRebuild)("faq");
    },
};
