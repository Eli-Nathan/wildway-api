import { createLogger, format, transports, Logger } from "winston";

const logger: Logger = createLogger({
  level: "info",
  exitOnError: false,
  format: format.json(),
  transports: [new transports.Console()],
});

export default logger;
