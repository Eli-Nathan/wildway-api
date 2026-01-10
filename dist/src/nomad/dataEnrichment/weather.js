"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWeather = void 0;
const axios_1 = __importDefault(require("axios"));
const getWeather = async ({ lat, lng, }) => {
    const weather = await axios_1.default.get(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&exclude=minutely&appid=${process.env.WEATHER_API_KEY}`);
    const weatherData = weather === null || weather === void 0 ? void 0 : weather.data;
    if (weatherData) {
        return {
            weatherLocation: weatherData.city.name,
            weather: weatherData.list,
        };
    }
    return undefined;
};
exports.getWeather = getWeather;
