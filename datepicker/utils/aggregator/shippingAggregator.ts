import {IShippingParams, IShippingRate, IShippingRateRequestBodyItem} from '@/app/utils/aggregator/types'
import Aggregator from '@/app/utils/aggregator/aggregator'
import {isBefore, isEqual, startOfDay} from 'date-fns'
import methods from '../../atlas'
import PostcodeParser from '@/app/utils/postcodeParser'
import {utcToZonedTime, zonedTimeToUtc} from 'date-fns-tz'
import {APP_TIMEZONE} from '@/app/consts/app'
import DateHelper from '@/app/utils/date'
import ShippingMethodModel from '../../models/ShippingMethod'

const requiresShipping = (items: IShippingRateRequestBodyItem[]): boolean => {
    return (items.filter(item => item.requires_shipping).length > 0)
}

export const getNominatedDate = (items: IShippingRateRequestBodyItem[]): Date | null => {

    const itemWithDateAttribute = items.find((item) => {
        return typeof item.properties['_nominated_date'] !== 'undefined'
    })

    if (!itemWithDateAttribute) {
        return null
    }

    const property = itemWithDateAttribute.properties['_nominated_date']

    if (!property) return null

    return new Date(property)
}

export const getCartTotalPrice = (items: IShippingRateRequestBodyItem[]): number => {
    let total = 0

    items.forEach((item) => {
        total += (item.price * item.quantity)
    })

    return total
}

export const getCartTotalWeight = (items: IShippingRateRequestBodyItem[]): number => {
    let weight = 0

    items.forEach((item) => {
        weight += (item.grams * item.quantity)
    })

    return weight
}

/**
 * @todo this needs refactoring / tidying and could probably do with decoupling from the API aggregator function
 * @param params
 * @constructor
 */
const ShippingAggregator = (params: IShippingParams) => {

    const aggregate = async (): Promise<IShippingRate[] | null> => {

        const request = params.query.rate.rate

        // @todo probably need to return an electronic method here
        if (!requiresShipping(params.query.rate.rate.items)) return

        // get postcode
        const postcode = PostcodeParser.parse(request.destination.postal_code)

        // get cart total
        const cartTotal = getCartTotalPrice(request.items)

        // get cart weight
        const cartWeight = getCartTotalWeight(request.items)

        // run aggregation
        const aggregator = Aggregator({
            query: {
                storeId: params.query.storeId,
                postcode: postcode,
                lineItems: request.items.filter(item => item.requires_shipping).map((item) => {
                    return {
                        productId: `gid://shopify/Product/${item.product_id.toString()}`,
                        variantId: `gid://shopify/ProductVariant/${item.variant_id.toString()}`,
                        sku: item.sku,
                        grams: item.grams,
                        quantity: item.quantity
                    }
                })
            }
        })

        // get nominated date from line items & ensure it is still available
        const nominatedDate = getNominatedDate(request.items)

        if (!nominatedDate) {
            throw new Error('Unable to determine nominated date attributed to request')
        } else if (isBefore(nominatedDate, startOfDay(new Date()))) {
            throw new Error(`Requested date is in the past "${nominatedDate.toUTCString()}"`)
        }

        // attempt to aggregate
        const result = await aggregator.aggregate()

        if (!result) {
            throw new Error('Aggregation failed')
        }

        // check date is available
        const aggregatedNominatedDate = result.dates.find(date => date.date.toISOString() === nominatedDate.toISOString())
        if (!aggregatedNominatedDate || !aggregatedNominatedDate.available) {
            throw new Error('Nominated date is no longer available')
        }

        // aggregate methods to determine if any have hit capacity for the nominated date
        const methodsWithOrderLimits = result.available_shipping_methods.filter(availableMethod => availableMethod.method.daily_order_limit > 0)
        if (methodsWithOrderLimits.length) {

            const exceedingLimitForDay = await methods.order.exceedingShippingMethodLimitForDay(
                params.query.storeId,
                methodsWithOrderLimits.map(orderLimitedMethod => orderLimitedMethod.method.service_code),
                nominatedDate
            )

            if (exceedingLimitForDay.length) {

                // remove any methods exceeding the limit from the relevant methods
                exceedingLimitForDay.forEach((method) => {
                    const index = result.available_shipping_methods.findIndex(m => m.method._id.toString() === method.method._id.toString())
                    if (index > -1) {
                        result.available_shipping_methods.splice(index, 1)
                    }
                })
            }
        }

        // determine which of the aggregated methods are applicable to the order
        const relevantMethods = result.available_shipping_methods.filter((availableMethod) => {

            // is this id blocked for this date
            if (aggregatedNominatedDate.blockedIds.includes(availableMethod.method._id.toString())) {
                return false
            }

            const model = ShippingMethodModel(availableMethod.method)

            // remove any methods which earliest promise is past the nominated date
            if (isBefore(nominatedDate, zonedTimeToUtc(availableMethod.earliest_date, APP_TIMEZONE))) {
                return false
            }

            // handle same day / next day
            if (isEqual(nominatedDate, zonedTimeToUtc(availableMethod.earliest_date, APP_TIMEZONE))) {
                return true
            }

            // ensure delivery day is enabled
            if (!model.method.delivery_days[DateHelper().dayToString(utcToZonedTime(nominatedDate, APP_TIMEZONE).getDay())].enabled) {
                return false
            }

            return !model.isExpressMethod()
        })

        return relevantMethods.map((relevantMethod) => {

            const model = ShippingMethodModel(relevantMethod.method)

            const methodPrice = model.getMethodRateForCart(request.items, cartTotal, cartWeight, nominatedDate)

            return {
                service_name: relevantMethod.method.name,
                service_code: relevantMethod.method.service_code,
                total_price: methodPrice,
                description: relevantMethod.method.description,
                phone_required: relevantMethod.method.required_phone,
                currency: 'GBP'
            }
        })
    }

    return {
        aggregate
    }
}

export default ShippingAggregator
