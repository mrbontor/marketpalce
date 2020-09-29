const iniParser = require('../libs/iniParser')
const uuid = require('uuid').v4
const request = require('./needleRequest')

let config = iniParser.get()

const URL_DISBURSEMENT   = 'disburse';
const URL_CHECK_STATUS   = 'disburse/';

let key = Buffer.from(config.flipapi.sc + ':').toString('base64');

const req_header = {
    'follow_max': 5,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Authorization': 'Basic '+ key
}

async function transfer(data) {
    let options = {
        headers: req_header
    }

    let result = await request('POST', URL_DISBURSEMENT, data, options)
    if ( null === result) {
        return null
    }

    return result
}

async function detail(data) {
    let options = {
        headers: req_header
    }

    let result = await request('GET', URL_CHECK_STATUS + data, {}, options)
    if ( null === result) {
        return null
    }

    return result
}


module.exports = {
    transfer,
    detail
};
