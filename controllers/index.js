const fs = require('fs')
const Ajv = require('ajv');
const iniParser = require('../libs/iniParser')
const logging = require('../libs/logging')
const util = require('../libs/utils')
const api = require('./flipApi')
const db = require('./mongoController')
const pusher = require('../libs/MQService')

const createDisbursement = JSON.parse(fs.readFileSync('./schemas/create_disbursement.json'))

let config = iniParser.get()
//show All error if data not valid
const ajv = new Ajv({
    allErrors: false,
    loopRequired: Infinity
}); // options can be passed, e.g. {allErrors: true}


const SUCCESS           = 200
const BAD_REQUEST       = 400
const UNAUTHORIZED      = 401
const NOT_FOUND         = 404
const INTERNAL_ERROR    = 500

async function create_disbursement(req, res) {
    let respons = {status: false, message: "Failed"}
    try {
        let _request = req.body
        logging.debug(`[PAYLOAD] >>>> ${JSON.stringify(_request)}`)

        //validate user request
        let isRequestValid = await createRequestDisburse(_request)
        logging.debug(`[isRequestValid] >>>> TRUE =>FALSE || FALSE => TRUE ${JSON.stringify(isRequestValid)}`)

        if (isRequestValid.message){
            respons.errors = isRequestValid.message.message
            return res.status(BAD_REQUEST).send(respons);
        }

        //check if user exist
        let isUserExist = await checkUser(_request.username)
        logging.debug(`[userData] >>>> ${JSON.stringify(isUserExist)}`)
        if(!isUserExist) {
            respons.message = 'User not found'
            return res.status(NOT_FOUND).send(respons);
        }

        //check if transaction exist
        let isTrxExist = await checkTrx(_request.uuid)
        logging.debug(`[userTransaction] >>>> ${JSON.stringify(isTrxExist)}`)
        if(isTrxExist) {
            respons.message = 'Transaction is exist, please try again again in a few minutes'
            return res.status(202).send(respons);
        }

        //ensure data amount is number/integer/etc
        _request.data.transaction.amount = parseInt(_request.data.transaction.amount)
        //request transfer
        let transfer = await api.transfer(_request.data.transaction)

        if (transfer.errors) {
            respons.errors = transfer.errors
            return res.status(BAD_REQUEST).send(respons);
        }

        let dataStore = schema_transaction(_request, transfer)

        //store request transaction to db mongodb
        let storeTrx = await db.saveData(config.mongodb.collection_transactions, dataStore)
        logging.debug(`[saveDataTrx] >>>> ${JSON.stringify(storeTrx)}`)
        if (!storeTrx._id) {
            respons.message = 'Something went wrong, please try again in a few minutes'
            return res.status(202).send(respons);
        }

        //trigger worker to check status transaction
        try {
            sendToQueueTrx(storeTrx._id, transfer.id)

        } catch (e) {
            logging.debug(`[sendToQueueTrx] >>>> ${JSON.stringify(e.stack)}`)
        }

        respons = {
            status: true,
            message: "Success",
            data: transfer
        }
        res.status(SUCCESS).send(respons)
    } catch (e) {
        logging.debug(`[createDisbursement][Err]   >>>>> ${e.stack}`)
        res.status(INTERNAL_ERROR).send(respons)
    }
}

function schema_transaction(_req, _res) {
    let request = {
        data: _req.data.transaction
    }
    let response = _res
    response.id = "" + _res.id
    return {
        _id: _req.uuid,
        username: _req.username,
        request: request,
        response: response,
        created_at: util.formatDateStandard(new Date(), true),
    }
}

async function get_detail_disbursement(req, res) {
    let respons = {status: false, message: "Failed"}
    try {
        let _request = req.params
        logging.debug(`[PAYLOAD] >>>> ${JSON.stringify(_request)}`)

        if (!_request.id) {
            respons.message = 'Data not found'
            return res.status(NOT_FOUND).send(respons)
        }

        let detail = await api.detail(_request.id)

        if (detail.errors) {
            respons.errors = detail.errors
            return res.status(BAD_REQUEST).send(respons);
        }

        respons = {
            status: true,
            message: "Success",
            data: detail
        }
        res.status(SUCCESS).send(respons)
    } catch (e) {
        logging.debug(`[getDetailDisbursement]   >>>>> ${e.stack}`)
        res.status(INTERNAL_ERROR).send(respons)
    }
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

async function checkUser(username) {
    try {
        let getUser = await db.findData(config.mongodb.collection_users, {username: username})
        if (getUser.length === 0) {
            return false;
        }
        return getUser[0];

    } catch (e) {
        throw (false)
    }
}

async function checkTrx(uid) {
    try {
        let getTrx = await db.findData(config.mongodb.collection_transactions, {_id: uid})
        if (getTrx.length === 0) {
            return false;
        }
        return getTrx[0];

    } catch (e) {
        throw (false)
    }
}

function sendToQueueTrx(id, trx_id) {
    let dataQueueTrx = {
        id: id,
        trx_id: trx_id
    }
    pusher(config.queue.host, config.queue.queName, dataQueueTrx)
}

module.exports = {
    create_disbursement,
    get_detail_disbursement
};
