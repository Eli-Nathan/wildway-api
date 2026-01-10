interface EnvFunction {
  (key: string, defaultValue?: string): string;
  int(key: string, defaultValue?: number): number;
  bool(key: string, defaultValue?: boolean): boolean;
}

interface ServerConfig {
  url: string;
}

export default ({ env }: { env: EnvFunction }): ServerConfig => ({
  url: env("MY_HEROKU_URL"),
});
