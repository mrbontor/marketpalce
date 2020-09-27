const express = require('express')
const fs = require('fs');
const uuid = require('uuid').v4
const iniParser = require('./libs/iniParser')
const logging = require('./libs/logging')
const args = require('minimist')(process.argv.slice(2));
const bodyParser = require('body-parser')
const app = express()

const NODE_ENV = process.env.NODE_ENV
process.env.TZ = 'Asia/Jakarta'

// default config if config file is not provided
let config = {
    log: {
        path: 'var/log/',
        level: 'debug',
        type: 'file',
        errorSufix: '-error',
        filename: 'logFlipApi'
    },
    app: {
        host: '127.0.0.1',
        port: 80
    },
    flipapi: {
        url: 'https://example.com'
    }
}

// overwrite default config with config file
const defaultConfigFile = ('production' === NODE_ENV) ? './configs/config.flip.api.prod.ini' : './configs/config.flip.api.dev.ini'

/* Initialise Config */
let configFile = args.c || args.config || defaultConfigFile;
config = iniParser.init(config, configFile);
config.log.level = args.logLevel || config.log.level;

/** Initalise logging*/
logging.init(config.log)

/* print CONFIG */
logging.info(`[APP][FLIPAPI][CONFIG] ${JSON.stringify(config)}`)

/* print ARGS */
logging.info(`[APP][ARGS] ${JSON.stringify(args)}`)

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());


app.use(function (req, res, next) {
    const { rawHeaders, httpVersion, method, socket, url } = req;
    const { remoteAddress, remoteFamily } = socket || {};
    let dataReq = JSON.stringify({
        timestamp: Date.now(),
        rawHeaders,
        httpVersion,
        method,
        remoteAddress,
        remoteFamily,
        url
    })

    if (undefined === req.body.uuid) req.body.uuid = uuid()

    logging.http(`[IN][REQUEST] [${req.body.uuid}] ${dataReq}`);
    logging.http(`[IN][REQUEST][BODY] [${req.body.uuid}] ${JSON.stringify(req.body)}`);
    next();
});

/* Routes the request */
const routes        = require('./router')
routes(app)

app.listen(config.app.port, () => {
    logging.info(`[APP][FLIPAPI] started on PORT : ${config.app.port} ENV : ${NODE_ENV}`)
});

process
.on('unhandledRejection', (reason, p) => {
    console.error(reason, 'Unhandled Rejection at Promise', p);
})
.on('uncaughtException', err => {
    console.error(err, 'Uncaught Exception thrown');
});
