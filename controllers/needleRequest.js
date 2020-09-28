const needle        = require('needle')
const iniParser = require('../libs/iniParser')
const logging = require('../libs/logging')
const {genReff} = require('../libs/utils')

let config = iniParser.get()

function apiRequest(method, url, data, options={}){
    let baseUrl = config.flipapi.url + url
    let reff = genReff()
    logging.http(`[FLIP-API][REQ][OUT] REFF: ${reff} ${method} ${baseUrl} ${JSON.stringify(data)} ${JSON.stringify(options)}`)
    return new Promise(function(resolve, reject) {
        needle.request(method, baseUrl, data, options, function(err, resp, body) {
            logging.http(`[FLIP-API][RES][IN] REFF: ${reff} ${resp.statusCode} ${JSON.stringify(body)}`)
            if (undefined === body) reject(null)

            resolve(body)
        });
    });
}

module.exports = apiRequest;
