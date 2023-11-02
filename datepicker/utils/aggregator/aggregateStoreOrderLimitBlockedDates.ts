import {IParams} from '@/app/utils/aggregator/types'
import {IStoreDocument} from '@/app/types/store'
import methods from '../../atlas'

interface IResult {
    date: Date
}

const aggregateStoreOrderLimitBlockedDates = async (params: IParams, today:Date, store: IStoreDocument): Promise<IResult[]> => {
    if (store.config.max_orders === 0) return []

    const result = await methods.order.exceedingDailyLimit(store._id, store.config.max_orders, today)

    return result.map((aggregate) => {
        return {
            date: aggregate._id.date
        }
    })
}

export default aggregateStoreOrderLimitBlockedDates