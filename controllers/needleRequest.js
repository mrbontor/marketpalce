const needle        = require('needle')
const iniParser     = require('../libs/iniParser');
const logging       = require('../libs/logging');
const { genReff }   = require('../libs/utils')


async function api(method, url, payload, options={}) {
    let baseUrl = config.flipid.url + url
    let reff = genReff()
    options.json = options.json === undefined ? true : options.json
    options.compressed = true
    options.open_timeout = 30000
    options.read_timeout = 60000

    let res =  await needle(method, baseUrl, payload, options)

    logging.http(`[FLIP-ID][REQ][OUT] REFF: ${reff} ${method} ${baseUrl} ${JSON.stringify(payload)} ${JSON.stringify(options)}`)
    logging.http(`[FLIP-ID][RES][IN] REFF: ${reff} ${res.statusCode} ${JSON.stringify(res.body)}`)

    if (undefined === res.body) return null

    return res.body
}

module.exports = api;
