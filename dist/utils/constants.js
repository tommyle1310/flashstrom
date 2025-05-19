"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FLASHFOOD_FINANCE_neon_test_branch = exports.FLASHFOOD_FINANCE = exports.FIXED_DELIVERY_DRIVER_WAGE = exports.ResponseStatus = void 0;
exports.ResponseStatus = {
    OK: { httpCode: 200, message: 'Success', code: 0 },
    MissingInput: { httpCode: 400, message: 'Missing Input', code: 1 },
    InvalidFormatInput: {
        httpCode: 400,
        message: 'Invalid Format Input',
        code: 2
    },
    Unauthorized: { httpCode: 401, message: 'Unauthorized', code: 3 },
    ServerError: { httpCode: 500, message: 'Server Error', code: -1 },
    NotFound: { httpCode: 404, message: 'Not Found', code: -2 },
    DuplicatedRecord: { httpCode: 409, message: 'Duplicated Record', code: -3 },
    Forbidden: { httpCode: 403, message: 'Forbidden (Authorization)', code: -4 },
    InsufficientBalance: {
        httpCode: 400,
        message: 'Insufficient balance in the source wallet',
        code: -8
    },
    NotAcceptingOrders: {
        httpCode: 400,
        message: 'This restaurant is currently not accepting at the moment.',
        code: -5
    },
    NoDrivers: {
        httpCode: 400,
        message: 'This restaurant is currently not accepting at the moment.',
        code: -6
    },
    DRIVER_MAXIMUM_ORDER: {
        httpCode: 400,
        message: 'Driver has reached maximum number of orders',
        code: -7
    },
    EXPIRED: {
        httpCode: 400,
        message: 'Expired',
        code: -9
    },
    NOT_AVAILABLE: {
        httpCode: 400,
        message: 'Expired',
        code: -9
    }
};
exports.FIXED_DELIVERY_DRIVER_WAGE = 20;
exports.FLASHFOOD_FINANCE = {
    id: 'F_WALLET_06f81c5e-8ef5-4072-85b2-dc3f19f91ef3',
    user_id: 'USR_ee0f6d15-f7bf-4b97-a903-fa0406a43847',
    email: 'flashfood.finance@gmail.com'
};
exports.FLASHFOOD_FINANCE_neon_test_branch = {
    id: 'F_WALLET_55c3eaa9-8b2a-48ae-8476-b329a8f3d99f',
    user_id: 'USR_ba2e04fe-3281-4940-8aa3-37a56a3033c8',
    email: 'finance.flashfood@gmail.com'
};
//# sourceMappingURL=constants.js.map