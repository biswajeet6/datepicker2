import {IStoreDocument} from '@/app/types/store'

const createDefaultStore = (): IStoreDocument => {
    return {
        _id: null,
        token: null,
        webhook_subscriptions: [],
        config: {
            timezone: 'Europe/London',
            window: 28,
            max_orders: 50,
            carrier_test_mode_enabled: false,
            carrier_test_mode_match: Math.random().toString(36).substring(7),
            order_tagging_enabled: false,
            order_tagging_date_format: 'dd/MM/yyyy',
        },
        carrier_service: {
            id: null,
            name: null,
            active: false,
            service_discovery: false,
            carrier_service_type: null,
            admin_graphql_api_id: null,
            format: null,
            callback_url: null,
        }
    }
}

export default createDefaultStore