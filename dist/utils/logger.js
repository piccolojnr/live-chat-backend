"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = require("winston");
const consoleFormat = winston_1.format.combine(winston_1.format.colorize(), winston_1.format.timestamp(), winston_1.format.align(), winston_1.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`));
const fileFormat = winston_1.format.combine(winston_1.format.timestamp(), winston_1.format.errors({ stack: true }), winston_1.format.splat(), winston_1.format.json());
const logger = (0, winston_1.createLogger)({
    level: "info",
    format: fileFormat,
    defaultMeta: { service: "user-service" },
    transports: [
        new winston_1.transports.File({ filename: "logs/error.log", level: "error" }),
        new winston_1.transports.File({ filename: "logs/combined.log" })
    ]
});
exports.logger = logger;
if (process.env.NODE_ENV !== "production") {
    logger.add(new winston_1.transports.Console({
        format: consoleFormat
    }));
}
