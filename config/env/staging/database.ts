import { parse } from "pg-connection-string";

interface EnvFunction {
  (key: string, defaultValue?: string): string;
  int(key: string, defaultValue?: number): number;
  bool(key: string, defaultValue?: boolean): boolean;
}

interface DatabaseConfig {
  connection: {
    client: string;
    connection: {
      host: string | null | undefined;
      port: string | number | null | undefined;
      database: string | null | undefined;
      user: string | null | undefined;
      password: string | null | undefined;
      ssl: {
        rejectUnauthorized: boolean;
      };
    };
    debug: boolean;
  };
}

export default ({ env }: { env: EnvFunction }): DatabaseConfig => {
  const { host, port, database, user, password } = parse(env("DATABASE_URL"));

  return {
    connection: {
      client: "postgres",
      connection: {
        host,
        port,
        database,
        user,
        password,
        ssl: { rejectUnauthorized: false },
      },
      debug: false,
    },
  };
};
