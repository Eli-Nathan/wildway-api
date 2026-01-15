/**
 * addition-request router
 * Custom routes with middlewares and policies for Strapi 5
 */

export default {
  routes: [
    {
      method: "GET",
      path: "/addition-requests",
      handler: "addition-request.find",
      config: {
        auth: false,
        middlewares: ["api::addition-request.populate-additions"],
        policies: ["global::firebase-authed", "global::is-owner"],
      },
    },
    {
      method: "GET",
      path: "/addition-requests/:id",
      handler: "addition-request.findOne",
      config: {
        auth: false,
        middlewares: ["api::addition-request.populate-additions"],
        policies: ["global::firebase-authed", "global::is-owner"],
      },
    },
    {
      method: "POST",
      path: "/addition-requests",
      handler: "addition-request.create",
      config: {
        auth: false,
        middlewares: ["api::addition-request.populate-additions"],
        policies: ["global::firebase-authed", "global::set-owner"],
      },
    },
  ],
};
