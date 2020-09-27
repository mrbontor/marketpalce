const fs = require('fs')
const Ajv = require('ajv');
const iniParser = require('../libs/iniParser')
const logging = require('../libs/logging')
const util = require('../libs/utils')
const api = require('./flipApi')

const createDisbursement = JSON.parse(fs.readFileSync('./schemas/create_disbursement.json'))

let config = iniParser.get()
//show All error if data not valid
const ajv = new Ajv({
    allErrors: false,
    loopRequired: Infinity
}); // options can be passed, e.g. {allErrors: true}


const SUCCESSS          = 200
const BAD_REQUEST       = 400
const UNAUTHORIZED      = 401
const NOT_FOUND         = 404
const INTERNAL_ERROR    = 500

async function create_disbursement(req, res) {
    let respons = {status: false, message: "Failed"}
    try {
        let _request = req.body
        logging.debug(`[PAYLOAD] >>>> ${JSON.stringify(_request.data.transaction)}`)

        let isRequestValid = await createRequestDisburse(_request)
        logging.debug(`[isRequestValid] >>>> TRUE =>FALSE || FALSE => TRUE ${JSON.stringify(isRequestValid)}`)

        if (isRequestValid.message){
            respons.errors = isRequestValid.message.message
            return res.status(SUCCESS).send(respons);
        }

        let transfer = await api.transfer(_request.data.transaction)
        logging.debug(`[tranferBankAccoount]   >>>>> ${JSON.stringify(transfer)}`)

        if (transfer.status !== 200) {
            respons.message = transfer.message
            return res.status(BAD_REQUEST).send(respons);
        }

        // if (transfer.errors) {
        //     respons.errors = transfer.errors
        //     return res.status(BAD_REQUEST).send(respons);
        // }

        respons.status = true
        respons.data = transfer
        res.status(SUCCESSS).send(respons)
    } catch (e) {
        logging.debug(`[create_disbursement][Err]   >>>>> ${e.stack}`)
        res.status(INTERNAL_ERROR).send(respons)
    }
}

function get_detail_disbursement(req, res) {
    res.status(SUCCESSS)
}

async function createRequestDisburse(request) {
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
