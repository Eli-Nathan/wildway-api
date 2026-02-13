import { triggerNetlifyRebuild } from "../../../../nomad/netlifyRebuild";

export default {
  async afterCreate() {
    await triggerNetlifyRebuild("site-list");
  },
  async afterUpdate() {
    await triggerNetlifyRebuild("site-list");
  },
  async afterDelete() {
    await triggerNetlifyRebuild("site-list");
  },
};
