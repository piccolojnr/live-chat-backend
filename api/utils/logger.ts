import { createLogger, format, transports } from "winston";

const consoleFormat = format.combine(
    format.colorize(),
    format.timestamp(),
    format.align(),
    format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
);

const fileFormat = format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
);

const loggerTransports = [
    new transports.Console({
        format: consoleFormat
    })
];


const logger = createLogger({
    level: "info",
    format: fileFormat,
    defaultMeta: { service: "user-service" },
    transports: loggerTransports
});

export { logger };
