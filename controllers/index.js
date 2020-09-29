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
const SUCCESS_BUT       = 202 // request's was accepted but may have an issue
const BAD_REQUEST       = 400
const UNAUTHORIZED      = 401
const NOT_FOUND         = 404
const INTERNAL_ERROR    = 500

/*
 * [create_disbursement description]
 * this is a transfer function
 *
 * @param  {[type]} req [request]
 * @param  {[type]} res [response]
 * @return {[type]}     [object]
 */
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
            return res.status(SUCCESS_BUT).send(respons);
        }

        //check balance users
        let userBalance = await getUserSaldo(isUserExist._id)
        logging.debug(`[userTransaction] >>>> ${JSON.stringify(userBalance)}`)
        if(null === userBalance.saldo || userBalance.saldo < parseInt(_request.data.transaction.amount)) {
            respons.message = 'Insufisien balance'
            return res.status(BAD_REQUEST).send(respons);
        }

        //ensure data amount is number/integer/etc
        _request.data.transaction.amount = parseInt(_request.data.transaction.amount)
        //request transfer
        let transfer = await api.transfer(_request.data.transaction)

        if (transfer.errors) {
            respons.errors = transfer.errors
            return res.status(BAD_REQUEST).send(respons);
        }

        //prepare data before inserted
        _request.user_id = isUserExist._id
        delete _request.username
        let dataTrxFlip = schema_transaction_flip(_request, transfer)
        let dataTrxDetail = schema_transaction(_request, transfer, userBalance.saldo)

        //store request transaction to db mongodb
        let storeTrx = await db.saveData(config.mongodb.collection_transactions_flip, dataTrxFlip)
        logging.debug(`[saveDataTrx] >>>> ${JSON.stringify(storeTrx)}`)
        if (!storeTrx._id) {
            respons.message = 'Something went wrong, please try again in a few minutes'
            return res.status(SUCCESS_BUT).send(respons);
        }

        //trigger worker to check status transaction
        try {
            sendToQueueTrx(storeTrx._id, transfer.id, isUserExist._id)
        } catch (e) {
            logging.debug(`[sendToQueueTrx] >>>> ${JSON.stringify(e.stack)}`)
        }

        //all data has validated and checked, it time to go
        respons = {
            status: true,
            message: "Success",
            data: transfer
        }
        res.status(SUCCESS).send(respons)
        await db.saveData(config.mongodb.collection_transactions, dataTrxDetail)
    } catch (e) {
        logging.debug(`[createDisbursement][Err]   >>>>> ${e.stack}`)
        res.status(INTERNAL_ERROR).send(respons)
    }
}

/*
 * [schema_transaction_flip description]
 * formating data transaction from flip into database
 *
 * @param  {[type]} _req [obejct]
 * @param  {[type]} _res [obejct]
 * @return {[type]}      [obejct]
 */
function schema_transaction_flip(_req, _res) {
    let request = _req.data.transaction
    let response = _res

    response.id = "" + _res.id
    return {
        _id: _req.uuid,
        user_id: _req.user_id,
        request: request,
        response: response,
        created_at: util.formatDateStandard(new Date(), true),
    }
}

/*
 * [schema_transaction description]
 * formating data transaction into database
 * if user want to make transaction dinamicly
 * else user also can monitoring his/her balance change
 *
 * @param  {[type]} _req [object]
 * @param  {[type]} _res [object]
 * @return {[type]}      [object]
 */
function schema_transaction(_req, _res, saldo) {
    let request = _req.data.transaction
    let response = _res

    response.id = "" + _res.id
    return {
        // _id: _req.uuid,
        user_id: _req.user_id,
        type: 'tranfer_fund', //Initialize product marketplace, flip fund
        request_user: request,
        response_vendor: response,
        status: 'PENDING', //though user want to do refund or Something else
        current_saldo: saldo,
        bill_amount: _req.data.transaction.amount,
        fee: 0,
        total_bill: 0,
        reff: '', //users may need number vendor's refence, but ...
        trx_vendor: _req.uuid,
        created_at: util.formatDateStandard(new Date(), true),
    }
}


/*
 * [get_detail_disbursement description]
 * get detail transaction from flip server
 *
 * @param  {[type]} req [request]
 * @param  {[type]} res [response]
 * @return {[type]}     [object]
 */
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

/*
 * [createRequestDisburse description]
 * function to validate user request to create disbursement
 *
 * @param  {[type]} request [object]
 * @return {[type]}         [array]
 */
async function createRequestDisburse(request) {
    let result = {}
    let valid = ajv.validate(createDisbursement, request);

    logging.debug(`[IN][REQUEST][ValidateRequest] >>>> ${JSON.stringify(ajv.errors)}`)

    if (!valid) {
        result = util.handleErrorValidation(ajv.errors);
    }
    return Promise.resolve(result);
}

/*
 * [checkUser description]
 * check user is exist
 *
 * @param  {[type]} username [string]
 * @return {[type]}          [object]
 */
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

/*
 * [checkTrx description]
 * check transaction is exist / processing
 *
 * @param  {[type]} uid [uuid]
 * @return {[type]}     [object]
 */
async function checkTrx(uid) {
    try {
        let getTrx = await db.findData(config.mongodb.collection_transactions_flip, {_id: uid})
        if (getTrx.length === 0) {
            return false;
        }
        return getTrx[0];

    } catch (e) {
        throw (false)
    }
}

/*
 * [getUserSaldo description]
 * get data user dan user's saldo
 *
 * @param  {[type]} user_id [obejctId]
 * @return {[type]}         [object]
 */
async function getUserSaldo(user_id) {
    let docs = [
        {$match: {user_id: require('mongodb').ObjectId(user_id)}},
        {
            $lookup: {
                from: config.mongodb.collection_users,
                localField: "user_id",
                foreignField: "_id",
                as: "user_id"
            }
        },
        {
            $unwind: '$user_id'
        }
    ]

    let result = await db.findAgg(config.mongodb.collection_users_saldo, docs)

    logging.debug(`[userInfo&Saldo] >>>> ${JSON.stringify(result)}`)
    if (result.length > 0) return result[0];
    return null;
}

/*
 * [sendToQueueTrx description]
 * processing data transaction into queue
 *
 * @param  {[type]} id      [uuid]
 * @param  {[type]} trx_id  [number]
 * @param  {[type]} user_id [ObjectId]
 * @return {[type]}         [string]
 */
function sendToQueueTrx(id, trx_id, user_id) {
    let dataQueueTrx = {
        id: id,
        trx_id: trx_id,
        user_id: user_id
    }
    pusher(config.queue.host, config.queue.queName, dataQueueTrx)
}

module.exports = {
    create_disbursement,
    get_detail_disbursement
};
