import {IResult} from '@/app/utils/aggregator/types'

const initResult = (): IResult => {
    return {
        dates: [],
        available_shipping_methods: [],
    }
}

export default initResult