import {IParams} from '@/app/utils/aggregator/types'
import initResult from '@/app/utils/aggregator/initResult'
import AggregationError from '@/app/utils/aggregator/AggregationError'
import determineRegion from '@/app/utils/aggregator/determineRegion'
import methods from '../../atlas'
import {IBlockedDate, IRegion, IRule, IShippingMethod, IStoreDocument} from '@/app/types/store'
import determineRules from '@/app/utils/aggregator/determineRules'
import {addDays, differenceInDays, isAfter, isBefore, isEqual, isToday, isTomorrow, startOfDay} from 'date-fns'
import calculateDeliveryPromises from '@/app/utils/aggregator/calulateDeliveryPromises'
import aggregateStoreOrderLimitBlockedDates from '@/app/utils/aggregator/aggregateStoreOrderLimitBlockedDates'
import aggregateShippingMethodBlockedDates from '@/app/utils/aggregator/aggregateShippingMethodBlockedDates'
import errors from '@/app/utils/aggregator/errors'
import {utcToZonedTime, zonedTimeToUtc} from 'date-fns-tz'
import {APP_TIMEZONE} from '@/app/consts/app'
import ShippingMethodModel from '../../models/ShippingMethod'
import {DAYS_IN_WEEK} from '@/app/utils/date'
import aggregateProductLimitBlockedDates from '@/app/utils/aggregator/aggregateProductLimitBlockedDates'
import aggregateAvailableMethods from '@/app/utils/aggregator/aggregateAvailableMethods'
import checkDateBetween from '@/app/utils/checkDateBetween'

const getStore = async (params: IParams): Promise<IStoreDocument> => {
    const result = await methods.store.getById(params.query.storeId)

    if (!result) throw AggregationError({
        message: errors.invalidStore.message,
        errorCode: errors.invalidStore.errorCode
    })

    return result
}

const getShippingMethods = async (params: IParams, region: IRegion): Promise<IShippingMethod[]> => {

    const result = await methods.shippingMethod.getByRegionId(params.query.storeId, region._id)

    // filter out methods with conditions that have not been matched
    const availableMethods = aggregateAvailableMethods(params, result)

    if (availableMethods.length === 0) throw AggregationError({
        message: errors.noShippingMethods.message,
        errorCode: errors.noShippingMethods.errorCode
    })

    return availableMethods
}

/**
 * Get all shipping level blocked dates
 * @param params 
 * @param shippingMethods 
 * @returns 
 */
const getMethodBlockedDates = async (params: IParams, shippingMethods: IShippingMethod[]): Promise<IBlockedDate[]> => {
    return await methods.blocked_date.getByResourceIds(
        params.query.storeId,
        shippingMethods.map(shippingMethod => shippingMethod._id)
    )
}

const getBlockedDates = async (params: IParams, rules: IRule[]): Promise<IBlockedDate[]> => {
    return await methods.blocked_date.getByResourceIds(
        params.query.storeId,
        [params.query.storeId].concat(rules.map(rule => rule._id))
    )
}

const Aggregator = (params: IParams) => {

    const result = initResult()

    const getData = async () => {
        const store = await getStore(params)
        const region = await determineRegion(params)
        const shippingMethods = await getShippingMethods(params, region)
        const shippingMethodBlockedDates = await getMethodBlockedDates(params, shippingMethods)
        const rules = await determineRules(params, region)
        const blockedDates = await getBlockedDates(params, rules)
        return {
            store,
            region,
            shippingMethods,
            shippingMethodBlockedDates,
            rules,
            blockedDates,
        }
    }


    const aggregate = async () => {

        if (!params.query.postcode) {
            throw AggregationError({
                message: errors.invalidPostcode.message,
                errorCode: errors.invalidPostcode.errorCode,
                data: params.query
            })
        }

        // get all the data required to perform the aggregation
        const data = await getData()

        // initialise zoned Date objects
        const today = startOfDay(new Date())
        const now = utcToZonedTime(new Date(), APP_TIMEZONE)

        // initialise all dates between maximum window
        for (let i = 0; i < data.store.config.window; i++) {
            result.dates.push({
                date: addDays(today, i),
                available: true,
                source: null,
                blockedIds: []
            })
        }

        // aggregate delivery promises
        const deliveryPromises = calculateDeliveryPromises({
            methods: data.shippingMethods,
            from: today,
            now: now,
            blockedMethodDates: data.shippingMethodBlockedDates
        }).filter(promise => promise.fulfillable)

        if (deliveryPromises.length === 0) {
            throw AggregationError(errors.noFulfillableShippingMethods)
        }

        // remove availability for dates based on delivery promises
        const earliestPromise = deliveryPromises.sort((a, b) => isBefore(a.date, b.date) ? -1 : 1)[0]
        result.dates = result.dates.map((date) => {
            if (isBefore(date.date, earliestPromise.date)) {
                date.available = false
                date.source = 'earliest_promise'
            }
            return date
        })

        // remove availability for dates based maximum offset
        let offset = 0
        data.rules.forEach((rule) => {
            if (parseInt(rule.offset.toString()) > offset)
                offset = parseInt(rule.offset.toString())
        })
        if (offset > 0) {
            const offsetDate = addDays(today, offset)

            result.dates = result.dates.map((date) => {
                if (isBefore(date.date, offsetDate)) {
                    date.available = false
                    date.source = 'offset'
                }
                return date
            })
        }

        // disable dates based on day availability from the aggregated available methods
        result.dates = result.dates.map((date) => {

            const day = DAYS_IN_WEEK[date.date.getDay()]

            let canBeFulfilled = false

            deliveryPromises.forEach((deliveryPromise) => {
                let thisMethodCanBeFulfilled = false
                const methodModel = ShippingMethodModel(deliveryPromise.method)

                if (methodModel.method.delivery_days[day].enabled) {
                    if (methodModel.isExpressMethod()) {
                        if (isEqual(date.date, deliveryPromise.date)) {
                            thisMethodCanBeFulfilled = true
                        }
                    } else {
                        if (date.date >= deliveryPromise.date) {
                            thisMethodCanBeFulfilled = true
                        }
                    }
                    if (thisMethodCanBeFulfilled) {
                        // if this method can be fulfilled
                        // check if this method has blocked date 
                        // check if the date is blocked
                        const fulfilledDateIsBlocked = data.shippingMethodBlockedDates
                            .filter(blockedMethod => blockedMethod.resource_id == methodModel.method._id)
                            .filter(methodBlockDate => checkDateBetween(zonedTimeToUtc(date.date, data.store.config.timezone), methodBlockDate))
                        // if no blocked dates for this method on this day    
                        if (fulfilledDateIsBlocked.length === 0) {
                            canBeFulfilled = true
                        } else {
                            date.blockedIds.push(methodModel.method._id.toString())
                        }
                    }
                }
            })

            if (!canBeFulfilled) {
                date.available = false
                date.source = 'day_availability'
            }
            return date
        })

        // convert dates to app timezone
        // @todo this should either happen first before anything else, or last...
        // ideally we'd preform all the aggregations below in UTC, then convert the result to the app timezone
        result.dates = result.dates.map((date) => {
            date.date = zonedTimeToUtc(date.date, data.store.config.timezone)

            return date
        })

        // remove dates based on blocked dates
        data.blockedDates.forEach((blockedDate) => {
            result.dates = result.dates.map((date) => {
                if (checkDateBetween(date.date, blockedDate)) {
                    date.available = false
                    date.source = 'blocked_date'
                }
                return date
            })
        })

        // get blocked dates aggregated from store order level limits
        const storeOrderLimitBlockedDates = await aggregateStoreOrderLimitBlockedDates(params, today, data.store)
        storeOrderLimitBlockedDates.forEach((blockedDate) => {
            result.dates = result.dates.map((date) => {
                if (isEqual(date.date, blockedDate.date)) {
                    date.available = false
                    date.source = 'store_limits'
                }
                return date
            })
        })

        // get blocked dates aggregated from shipping order limits
        const shippingMethodBlockedDates = await aggregateShippingMethodBlockedDates(params, deliveryPromises.filter(promise => promise.fulfillable).map(promise => promise.method))
        shippingMethodBlockedDates.forEach((blockedDate) => {
            result.dates = result.dates.map((date) => {
                if (isEqual(date.date, blockedDate.date)) {
                    date.available = false
                    date.source = 'shipping_method_limits'
                }
                return date
            })
        })

        // get blocked dates aggregated from product level limits
        const productLevelBlockedDates = await aggregateProductLimitBlockedDates(params, today, data.rules)
        productLevelBlockedDates.forEach((blockedDate) => {
            result.dates = result.dates.map((date) => {
                if (isEqual(date.date, blockedDate.date)) {
                    date.available = false
                    date.source = 'product_level_limits'
                }
                return date
            })
        })

        // attach available shipping methods
        result.available_shipping_methods = deliveryPromises.filter(promise => promise.fulfillable).map((promise) => {
            return {
                id: promise.method._id,
                method: promise.method,
                earliest_date: promise.date,
            }
        })

        // return aggregate date result
        return result
    }

    return {
        aggregate
    }
}

export default Aggregator
