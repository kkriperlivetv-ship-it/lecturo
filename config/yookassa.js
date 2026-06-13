const YooKassa = require('yookassa');

let yookassa = null;

function getYooKassa() {
    if (!yookassa) {
        const shopId = process.env.YOOKASSA_SHOP_ID;
        const secretKey = process.env.YOOKASSA_SECRET_KEY;
        
        if (shopId && secretKey) {
            yookassa = new YooKassa({
                shopId: shopId,
                secretKey: secretKey
            });
        }
    }
    return yookassa;
}

function isConfigured() {
    return !!(process.env.YOOKASSA_SHOP_ID && process.env.YOOKASSA_SECRET_KEY);
}

module.exports = {
    getYooKassa,
    isConfigured
};