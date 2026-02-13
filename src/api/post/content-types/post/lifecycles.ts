import { triggerNetlifyRebuild } from "../../../../nomad/netlifyRebuild";

export default {
  async afterCreate() {
    await triggerNetlifyRebuild("post");
  },
  async afterUpdate() {
    await triggerNetlifyRebuild("post");
  },
  async afterDelete() {
    await triggerNetlifyRebuild("post");
  },
};
