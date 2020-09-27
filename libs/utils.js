function handleErrorValidation(array) {
    return array.reduce((obj, item) => (obj['message'] = {field: item.dataPath, message: `${item.dataPath} ` +item.message}, obj) ,{});
}

function genReff() {
    return crypto.randomBytes(3).toString('hex');
}

module.exports = {
    handleErrorValidation,
    genReff
};
