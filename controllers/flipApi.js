const iniParser = require('../libs/iniParser')
const uuid = require('uuid').v4
const request = require('./needleRequest')

let config = iniParser.get()

const URL_DISBURSEMENT   = 'disburse';
const URL_CHECK_STATUS   = 'disburse/';

let key = Buffer.from(config.flipapi.sc + ':').toString('base64');
console.log('key', key);
const req_header = {
    'follow_max': 5,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Authorization': 'Basic '+ key
}

async function transfer(data) {
    let payload = {
        uuid: data.uuid || uuid(),
        username: data.username,
        data: {
            transaction: {
                account_number: data.account_number,
                bank_code: data.bank_code,
                amount: parseInt(data.amount),
                remark: data.remark
            }
        }
    }

    let options = {
        headers: req_header
    }

    let result = await request('POST', URL_DISBURSEMENT, payload, options)
    if ( null === result) {
        return null
    }

    return result
}

module.exports = {
    transfer
};
