"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = require("winston");
const logger = (0, winston_1.createLogger)({
    level: "info",
    exitOnError: false,
    format: winston_1.format.json(),
    transports: [new winston_1.transports.Console()],
});
exports.default = logger;
