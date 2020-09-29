module.exports = function(app) {
    const router = require('../controllers');

    app.route('/api/flip/disbursement/create')
        .post(router.create_disbursement)

    app.route('/api/flip/disbursement/id/:id')
        .get(router.get_detail_disbursement)

    app.route('/api/user/detail/:username')
        .get(router.get_info_user)

    app.route('/api/trx/:username')
        .get(router.get_history_trx)

    app.get('/api/flip/ping', function (req, res) {
        res.status(200).json({status: true, message: "How are you? i`m Fine. Thanks "})
    })
};
