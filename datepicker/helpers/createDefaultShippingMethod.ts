import {IShippingMethod, IShippingMethodDeliveryDay, IShippingMethodDispatchDay} from '@/app/types/store'
import {bool} from 'prop-types'

const makeDefaultDeliveryDay = (key: string): IShippingMethodDeliveryDay => {
    return {
        key: key,
        label: `${key.charAt(0).toUpperCase()}${key.slice(1)}`,
        enabled: true,
    }
}

const makeDefaultDispatchDay = (key: string): IShippingMethodDispatchDay => {
    return {
        key: key,
        label: `${key.charAt(0).toUpperCase()}${key.slice(1)}`,
        enabled: true,
        cutoff: '12:00'
    }
}

const createDefaultShippingMethod = (storeId: string, name: string): IShippingMethod => {
    return {
        store_id: storeId,
        name: name,
        type: 'domestic',
        enabled: true,
        description: null,
        service_code: null,
        required_phone: false,
        only_promise_delivery_days: true,
        promise_start: 2,
        promise_end: 4,
        price: 499,
        daily_order_limit: 0,
        region_ids: [],
        bands: [],
        conditions: {
            product_based: {
                enabled: false,
                type: 'at_least_one',
                product_ids: []
            },
            weight_based: {
                enabled: false,
                type: 'greater_than',
                value: {
                    min: 0,
                    max: 0,
                }
            },
            sku_based: {
                enabled: false,
                type: 'at_least_one',
                partial_match: false,
                value: null
            },
            custom: {
                enabled: false,
                script: ''
            }
        },
        delivery_days: {
            sunday: makeDefaultDeliveryDay('sunday'),
            monday: makeDefaultDeliveryDay('monday'),
            tuesday: makeDefaultDeliveryDay('tuesday'),
            wednesday: makeDefaultDeliveryDay('wednesday'),
            thursday: makeDefaultDeliveryDay('thursday'),
            friday: makeDefaultDeliveryDay('friday'),
            saturday: makeDefaultDeliveryDay('saturday')
        },
        dispatch_days: {
            sunday: makeDefaultDispatchDay('sunday'),
            monday: makeDefaultDispatchDay('monday'),
            tuesday: makeDefaultDispatchDay('tuesday'),
            wednesday: makeDefaultDispatchDay('wednesday'),
            thursday: makeDefaultDispatchDay('thursday'),
            friday: makeDefaultDispatchDay('friday'),
            saturday: makeDefaultDispatchDay('saturday')
        },
        apply_tags: [],
        apply_attributes: [],
        archived: false
    }
}

export default createDefaultShippingMethod