const winston = require('winston')
const {
    createLogger,
    format,
    transports
} = require('winston');
const {
    combine,
    timestamp,
    prettyPrint,
    printf,
    colorize
} = format;

process.env.TZ = 'Asia/Jakarta'

const myFormat = printf(info => {
    return `${info.timestamp} ${info.level}: ${info.message}`;
});


class Logging {
    logger

    createLogging(args) {
        this.logger = winston.createLogger({
            level: args.level,
            //timestamp: function() {
                //  return new Date()
                //},
            format: combine(
                colorize(),
                timestamp(),
                myFormat
            ),
            transports: [
                //
                // - Write to all logs with level `info` and below to `combined.log`
                // - Write all logs error (and below) to `error.log`.
                //
                new winston.transports.File({
                    filename: args.path + args.filename + args.errorSufix + '.log',
                    level: 'error'
                }),
                new winston.transports.File({
                    filename: args.path + args.filename + '.log'
                }),
            ]
        })

        // DEBUG:
        // if (process.env.NODE_ENV !== 'production') {
            //   logger.add(new winston.transports.Console({
                //     format: winston.format.simple()
                //   }));
                // }

                // Call exceptions.handle with a transport to handle exceptions
        logger.exceptions.handle(
            new transports.File({ filename: args.path + args.filename + '-exceptions.log' })
        );
    }

    createConsoleLogging(args) {
        this.logger = winston.createLogger({
            level: args.level,
            //timestamp: function() {
                //  return new Date()
                //},
            format: combine(
                colorize(),
                timestamp(),
                myFormat
            ),
            transports: [
                //
                // - Write to all logs with level `info` and below to `combined.log`
                // - Write all logs error (and below) to `error.log`.
                //
                new winston.transports.Console()
            ]
        })
    }


    init(args = {}) {
        if ('file' === args.file) return this.createLogging(args)

        return this.createConsoleLogging(args)
    }

    error(message) {
        this.logger.error(message)
    }

    warn(message) {
        this.logger.warn(message)
    }

    info(message) {
        this.logger.info(message)
    }

    http(message) {
        this.logger.http(message)
    }

    verbose(message) {
        this.logger.verbose(message)
    }

    debug(message) {
        this.logger.debug(message)
    }

    silly(message) {
        this.logger.silly(message)
    }
}

module.exports = new Logging()
