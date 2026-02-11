module.exports = [
  {
    method: "GET",
    path: "/addition-requests",
    handler: "moderator.findAdditions",
    config: {
      policies: [],
    },
  },
  {
    method: "GET",
    path: "/edit-requests",
    handler: "moderator.findEdits",
    config: {
      policies: [],
    },
  },
  {
    method: "GET",
    path: "/",
    handler: "moderator.findAll",
    config: {
      policies: [],
    },
  },
  {
    method: "GET",
    path: "/update/:collection/:id",
    handler: "moderator.reject",
    config: {
      policies: [],
    },
  },
  {
    method: "GET",
    path: "/approve-addition-request/:id",
    handler: "moderator.approveAddition",
    config: {
      policies: [],
    },
  },
  {
    method: "GET",
    path: "/approve-review/:id",
    handler: "moderator.approveReview",
    config: {
      policies: [],
    },
  },
  {
    method: "GET",
    path: "/approve-edit-request/:id",
    handler: "moderator.approveEdit",
    config: {
      policies: [],
    },
  },
];
