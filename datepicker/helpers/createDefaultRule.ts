import {IRule} from '@/app/types/store'

const createDefaultRule = (storeId: string, title: string, now: Date): IRule => {
    return {
        store_id: storeId,
        title: title,
        enabled: false,
        conditions: {
            region_based: {
                enabled: false,
                type: 'in',
                region_ids: []
            },
            product_based: {
                enabled: false,
                type: 'at_least_one',
                product_ids: []
            },
        },
        production_limits: {
            product_ids: [],
            max_units_per_day: 0
        },
        offset: 0,
        active_from: {
            start: now,
            end: null
        },
        archived: false
    }
}

export default createDefaultRule