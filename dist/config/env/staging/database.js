"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg_connection_string_1 = require("pg-connection-string");
exports.default = ({ env }) => {
    const { host, port, database, user, password } = (0, pg_connection_string_1.parse)(env("DATABASE_URL"));
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
