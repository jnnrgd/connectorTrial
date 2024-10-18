import winston from 'winston';

const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.simple(),
    ),
    transports: [
        new winston.transports.Console({
            level: 'debug',
            format: winston.format.printf(({ timestamp, level, message }) => {
                return `${timestamp} ${level}: ${message}`;
            }),
        }),
        new winston.transports.Console({
            level: 'error',
            format: winston.format.printf(({ timestamp, level, message }) => {
                return `${timestamp} ${level}: ${message}`;
            }),
            stderrLevels: ['error'],
        }),
    ],
});

export default logger;
