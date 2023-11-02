import {IShippingMethodBand} from '@/app/types/store'

const createDefaultShippingBand = (priority: number): IShippingMethodBand => {
    return {
        name: `New Band ${priority}`,
        priority: priority,
        requirement: {
            type: 'cartCost',
            condition: 'between',
            value: {
                min: 0,
                max: 0,
            },
        },
        cost: {
            type: 'fixedCost',
            value: 0
        }
    }
}

export default createDefaultShippingBand