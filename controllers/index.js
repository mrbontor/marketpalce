const fs = require('fs')
const Ajv = require('ajv');
const iniParser = require('../libs/iniParser')
const logging = require('../libs/logging')
const util = require('../libs/utils')
const request = require('./needleRequest')

const createDisbursement    = JSON.parse(fs.readFileSync('./schemas/create_disbursement.json'))

let config = iniParser.get()
//show All error if data not valid
const ajv = new Ajv({
    allErrors: false,
    loopRequired: Infinity
}); // options can be passed, e.g. {allErrors: true}


const SUCCESSS          = 200
const ACCESS_FORBIDDEN  = 403
const NOT_FOUND         = 404
const INTERNAL_ERROR    = 500

async function create_disbursement(req, res) {
    let respons = {status: false, message: "Failed"}
    try {
        let _request = formatRequest(req.body)
        logging.debug(`[IN][REQUEST][BODY] >>>> ${JSON.stringify(_request)}`)

        let isRequestValid = await createRequesTrx(_request)
        logging.debug(`[isRequestValid] >>>> TRUE =>FALSE || FALSE => TRUE ${JSON.stringify(isRequestValid)}`)

        if (isRequestValid.message){
            respons.errors = isRequestValid.message.message
            return res.status(SUCCESS).send(respons);
        }

        res.status(SUCCESSS).send(respons)
    } catch (e) {
        logging.debug(`[create_disbursement][Err]   >>>>> ${e.stack}`)
        res.status(SUCCESS).send(respons)
    }
}

function get_detail_disbursement(req, res) {
    res.status(SUCCESSS)
}

async function createRequesDisburse(request) {
    let result = {}
    let valid = ajv.validate(createDisbursement, request);

    logging.debug(`[IN][REQUEST][ValidateRequest] >>>> ${JSON.stringify(ajv.errors)}`)

    if (!valid) {
        result = util.handleErrorValidation(ajv.errors);
    }
    return Promise.resolve(result);
}


module.exports = {
    create_disbursement,
    get_detail_disbursement
};
