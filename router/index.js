module.exports = function(app) {
    const router = require('../controllers');

    app.route('/api/flip/disbursement/create')
        .post(router.create_disbursement)

    app.route('/api/flip/disbursement/id/:id')
        .get(router.get_detail_disbursement)

    app.get('/api/flip/ping', function (req, res) {
        res.status(200).json({status: true, message: "How are you? i`m Fine. Thanks "})
    })
};
