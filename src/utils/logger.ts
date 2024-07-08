import { createLogger, format, transports } from "winston"

const consoleFormat = format.combine(
    format.colorize(),
    format.timestamp(),
    format.align(),
    format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
)

const fileFormat = format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
)

const logger = createLogger({
    level: "info",
    format: fileFormat,
    defaultMeta: { service: "user-service" },
    transports: [
        new transports.File({ filename: "logs/error.log", level: "error" }),
        new transports.File({ filename: "logs/combined.log" })
    ]
}
)

if (process.env.NODE_ENV !== "production") {
    logger.add(new transports.Console({
        format: consoleFormat
    }))
}



export { logger }