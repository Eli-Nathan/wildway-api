/**
 * Users-permissions plugin extension
 *
 * The isAuthed policy now simply checks if the user is authenticated.
 * The actual Firebase authentication is handled by the global::firebase-auth middleware.
 */

interface PolicyContext {
  state: {
    user?: {
      id: number;
      sub?: string;
      role?: unknown;
      user_id?: string;
    };
  };
}

interface Plugin {
  policies: {
    [key: string]: (ctx: PolicyContext) => boolean;
  };
}

export default (plugin: Plugin): Plugin => {
  // The isAuthed policy checks if the user was authenticated by the firebase-auth middleware
  plugin.policies["isAuthed"] = (ctx: PolicyContext): boolean => {
    const isAuthed = !!ctx.state.user;
    console.log("isAuthed policy: state.user exists =", isAuthed, "user =", JSON.stringify(ctx.state.user));
    return isAuthed;
  };

  return plugin;
};
