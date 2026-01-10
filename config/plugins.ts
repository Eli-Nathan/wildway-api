interface EnvFunction {
  (key: string, defaultValue?: string): string;
  int(key: string, defaultValue?: number): number;
  bool(key: string, defaultValue?: boolean): boolean;
}

interface PluginsConfig {
  upload: {
    config: {
      provider: string;
      providerOptions: {
        cloud_name: string;
        api_key: string;
        api_secret: string;
      };
      actionOptions: {
        upload: string;
      };
    };
  };
  email: {
    config: {
      provider: string;
      providerOptions: {
        host: string;
        port: number;
        secure: boolean;
        username: string;
        password: string;
        rejectUnauthorized: boolean;
        requireTLS: boolean;
        connectionTimeout: number;
      };
    };
    settings: {
      defaultFrom: string;
      defaultReplyTo: string;
    };
  };
  moderator: {
    enabled: boolean;
    resolve: string;
  };
  "verify-user-email": {
    enabled: boolean;
    resolve: string;
  };
  "content-export-import": {
    enabled: boolean;
    resolve: string;
  };
}

export default ({ env }: { env: EnvFunction }): PluginsConfig => {
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
        provider: "strapi-provider-email-smtp",
        providerOptions: {
          host: "smtp.gmail.com",
          port: 465,
          secure: true,
          username: "wildway.app@gmail.com",
          password: env("WILDWAY_GMAIL_PASSWORD"),
          rejectUnauthorized: true,
          requireTLS: true,
          connectionTimeout: 1,
        },
      },
      settings: {
        defaultFrom: "wildway.app@gmail.com",
        defaultReplyTo: "wildway.app@gmail.com",
      },
    },
    moderator: {
      enabled: true,
      resolve: "./src/plugins/moderator",
    },
    "verify-user-email": {
      enabled: true,
      resolve: "./src/plugins/verify-user-email",
    },
    "content-export-import": {
      enabled: true,
      resolve: "./src/plugins/content-export-import",
    },
  };
};
