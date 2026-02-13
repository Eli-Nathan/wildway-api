import { triggerNetlifyRebuild } from "../../../../nomad/netlifyRebuild";

export default {
  async afterCreate() {
    await triggerNetlifyRebuild("nomad-route");
  },
  async afterUpdate() {
    await triggerNetlifyRebuild("nomad-route");
  },
  async afterDelete() {
    await triggerNetlifyRebuild("nomad-route");
  },
};
