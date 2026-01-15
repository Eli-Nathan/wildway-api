interface EnvFunction {
  (key: string, defaultValue?: string): string;
  int(key: string, defaultValue?: number): number;
  bool(key: string, defaultValue?: boolean): boolean;
}

export default ({ env }: { env: EnvFunction }) => {
  return {
    upload: {
      config: {
        provider: "cloudinary",
        providerOptions: {
          cloud_name: env("CLOUDINARY_NAME"),
          api_key: env("CLOUDINARY_KEY"),
          api_secret: env("CLOUDINARY_SECRET"),
        },
        actionOptions: {
          upload: "hnafqp5p",
        },
      },
    },
    email: {
      config: {
        provider: "nodemailer",
        providerOptions: {
          host: "smtp.gmail.com",
          port: 465,
          secure: true,
          auth: {
            user: "wildway.app@gmail.com",
            pass: env("WILDWAY_GMAIL_PASSWORD"),
          },
        },
        settings: {
          defaultFrom: "wildway.app@gmail.com",
          defaultReplyTo: "wildway.app@gmail.com",
        },
      },
    },
    // Custom plugins - moderator re-enabled after Strapi 5 fixes
    moderator: {
      enabled: true,
      resolve: "./src/plugins/moderator",
    },
    // "verify-user-email": {
    //   enabled: true,
    //   resolve: "./src/plugins/verify-user-email",
    // },
    // "content-export-import": {
    //   enabled: true,
    //   resolve: "./src/plugins/content-export-import",
    // },
  };
};
