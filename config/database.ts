import path from "path";

interface EnvFunction {
  (key: string, defaultValue?: string): string;
  int(key: string, defaultValue?: number): number;
  bool(key: string, defaultValue?: boolean): boolean;
}

interface DatabaseConfig {
  connection: {
    client: string;
    connection: {
      filename: string;
    };
    useNullAsDefault: boolean;
  };
}

export default ({ env }: { env: EnvFunction }): DatabaseConfig => ({
  connection: {
    client: "sqlite",
    connection: {
      filename: path.join(
        process.cwd(),
        env("DATABASE_FILENAME", ".tmp/data.db")
      ),
    },
    useNullAsDefault: true,
  },
});
