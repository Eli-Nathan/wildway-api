"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlacesFromQuery = exports.getPlaceFromLatLng = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = __importDefault(require("../logger"));
const getPlaceFromLatLng = async ({ lat, lng, }) => {
    const place = await axios_1.default.get(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
    return place === null || place === void 0 ? void 0 : place.data;
};
exports.getPlaceFromLatLng = getPlaceFromLatLng;
const getPlacesFromQuery = async ({ query, }) => {
    try {
        const places = await axios_1.default.get(`https://nominatim.openstreetmap.org/search?q=${query}, Scotland&format=jsonv2&countrycodes=gb&limit=50&namedetails=1&addressdetails=1&extratags=1&accept-language=en-GB`, {
            headers: { "User-Agent": `WildWay-${query}` },
        });
        logger_1.default.warn("Nominatim", `https://nominatim.openstreetmap.org/search?q=${query}, Scotland&format=jsonv2&countrycodes=gb&limit=50&namedetails=1&addressdetails=1&extratags=1&accept-language=en-GB`);
        return (places === null || places === void 0 ? void 0 : places.data) || [];
    }
    catch (err) {
        logger_1.default.warn("Nominatim error", err);
        return [];
    }
};
exports.getPlacesFromQuery = getPlacesFromQuery;
