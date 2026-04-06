import { triggerNetlifyRebuild } from "../../../../wildway/netlifyRebuild";

export default {
  async afterCreate() {
    await triggerNetlifyRebuild("faq");
  },
  async afterUpdate() {
    await triggerNetlifyRebuild("faq");
  },
  async afterDelete() {
    await triggerNetlifyRebuild("faq");
  },
};
