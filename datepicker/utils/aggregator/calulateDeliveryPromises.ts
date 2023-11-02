import {IShippingMethod, IBlockedDate} from '@/app/types/store'
import {startOfDay} from 'date-fns'
import ShippingMethodModel from '../../models/ShippingMethod'

interface ICalculateDeliveryPromisesResult {
    method: IShippingMethod
    date: Date
    fulfillable: boolean
}

interface IParams {
    methods: IShippingMethod[]
    from: Date
    now: Date
    blockedMethodDates: IBlockedDate[]
}

export const calculateDeliveryPromises = (params: IParams): ICalculateDeliveryPromisesResult[] => {
    return params.methods.map((method) => {

        const model = ShippingMethodModel(method)

        const promise = model.calculateDeliveryPromise(
            params.from, 
            params.now, 
            params.blockedMethodDates.filter(blockedMethod => blockedMethod.resource_id == method._id)
        )

        const fulfillable = !!promise

        const date = fulfillable ? startOfDay(promise.from) : null

        return {
            method: model.method,
            fulfillable: fulfillable,
            date: date,
            formatted_date: date ? date.toISOString() : null
        }
    })
}

export default calculateDeliveryPromises
