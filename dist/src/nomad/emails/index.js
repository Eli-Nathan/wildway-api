"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = exports.getApprovedMailContent = exports.getRejectedMailContent = exports.newUserAdded = void 0;
var newAccountAdded_1 = require("./newAccountAdded");
Object.defineProperty(exports, "newUserAdded", { enumerable: true, get: function () { return __importDefault(newAccountAdded_1).default; } });
var rejectedMail_1 = require("./rejectedMail");
Object.defineProperty(exports, "getRejectedMailContent", { enumerable: true, get: function () { return __importDefault(rejectedMail_1).default; } });
var approvedMail_1 = require("./approvedMail");
Object.defineProperty(exports, "getApprovedMailContent", { enumerable: true, get: function () { return __importDefault(approvedMail_1).default; } });
var sendEmail_1 = require("./sendEmail");
Object.defineProperty(exports, "sendEmail", { enumerable: true, get: function () { return __importDefault(sendEmail_1).default; } });
