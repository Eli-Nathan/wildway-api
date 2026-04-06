import { triggerNetlifyRebuild } from "../../../../wildway/netlifyRebuild";

export default {
  async afterCreate() {
    await triggerNetlifyRebuild("guide");
  },
  async afterUpdate() {
    await triggerNetlifyRebuild("guide");
  },
  async afterDelete() {
    await triggerNetlifyRebuild("guide");
  },
};
