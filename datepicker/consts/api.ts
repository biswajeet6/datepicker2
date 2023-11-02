const API_ROUTES = {
    AUTH: '/api/auth',
    INSTALL: '/api/install',
    TEST_POSTCODE: '/api/testPostcode',
    BLOCKED_DATE: {
        DELETE: '/api/blockedDate/delete',
        GET_BY_ID: '/api/blockedDate/getById',
        GET_BY_RESOURCE: '/api/blockedDate/getByResource',
        INSERT: '/api/blockedDate/insert',
        UPDATE: '/api/blockedDate/update',
    },
    STORE: {
        GET_BY_ID: '/api/store/getById',
        GET_CONFIG: '/api/store/getConfig',
        UPDATE_CONFIG: '/api/store/updateConfig',
        SYNC_WEBHOOK_SUBSCRIPTIONS: '/api/syncWebhooks',
        GET_WEBHOOK_SUBSCRIPTIONS: '/api/store/getWebhookSubscriptions',
        GET_CARRIER_SERVICE: '/api/store/getCarrierService',
        DELETE_CARRIER_SERVICE: '/api/store/deleteCarrierService',
        CREATE_CARRIER_SERVICE: '/api/store/createCarrierService',
    },
    RULES: {
        GET_BY_ID: '/api/rule/getById',
        GET_BY_STORE_ID: '/api/rule/getByStoreId',
        CREATE: '/api/rule/insert',
        UPDATE: '/api/rule/update',
        DELETE: '/api/rule/delete',
    },
    REGIONS: {
        GET_BY_ID: '/api/region/getById',
        GET_BY_STORE_ID: '/api/region/getByStoreId',
        CREATE: '/api/region/insert',
        UPDATE: '/api/region/update',
        DELETE: '/api/region/delete',
    },
    SHIPPING_METHODS: {
        GET_BY_ID: '/api/shippingMethod/getById',
        GET_BY_STORE_ID: '/api/shippingMethod/getByStoreId',
        CREATE: '/api/shippingMethod/insert',
        UPDATE: '/api/shippingMethod/update',
        DELETE: '/api/shippingMethod/delete',
    }
}

export default API_ROUTES