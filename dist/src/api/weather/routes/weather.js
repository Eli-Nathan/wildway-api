"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    routes: [
        {
            method: "GET",
            path: "/weather",
            handler: "weather.getWeather",
            config: {
                auth: false,
                policies: [], // Public endpoint, no auth required
            },
        },
        {
            method: "GET",
            path: "/weather/status",
            handler: "weather.getStatus",
            config: {
                auth: false,
                policies: [], // Admin key validated in controller
            },
        },
        {
            method: "POST",
            path: "/weather/toggle",
            handler: "weather.toggle",
            config: {
                auth: false,
                policies: [], // Admin key validated in controller
            },
        },
        {
            method: "POST",
            path: "/weather/clear-cache",
            handler: "weather.clearCache",
            config: {
                auth: false,
                policies: [], // Admin key validated in controller
            },
        },
    ],
};
exports.default = config;
