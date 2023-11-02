import {IShippingMethod, IShippingMethodBand, IBlockedDate} from '@/app/types/store'
import {addDays, isBefore, set as setDate} from 'date-fns'
import {IShippingRateRequestBodyItem} from '@/app/utils/aggregator/types'
import Logger from '@/app/utils/logger'
import checkDateBetween from '@/app/utils/checkDateBetween'
import {APP_TIMEZONE} from '@/app/consts/app'
import {zonedTimeToUtc} from 'date-fns-tz'

type TShippingMethodModel = (method: IShippingMethod) => ({
    method: IShippingMethod
    isExpressMethod(): boolean
    calculateDeliveryPromise(from: Date, now: Date, blockedMethodDates: IBlockedDate[]): {
        from: Date
    } | null
    getApplicableBandsForCart(cartItems: IShippingRateRequestBodyItem[], cartTotal: number, cartWeight: number, nominatedDate: Date): IShippingMethodBand[]
    getMethodRateForCart(cartItems: IShippingRateRequestBodyItem[], cartTotal: number, cartWeight: number, nominatedDate: Date): number
})

const ShippingMethodModel: TShippingMethodModel = (method) => ({
    method,
    getApplicableBandsForCart(cartItems: IShippingRateRequestBodyItem[], cartTotal: number, cartWeight = 0, nominatedDate: Date): IShippingMethodBand[] {

        if (!this.method.bands || this.method.bands.length === 0) {
            return []
        }

        const bands: IShippingMethodBand[] = this.method.bands

        return bands.filter((band) => {
            try {
                switch (band.requirement.type) {
                    case 'cartCost':
                        switch (band.requirement.condition) {
                            case 'between':
                                return (cartTotal > band.requirement.value.min) && (cartTotal < band.requirement.value.max)
                            case 'greaterThan':
                                return cartTotal > band.requirement.value
                            case 'lessThan':
                                return cartTotal < band.requirement.value
                            default:
                                Logger.error(`Unknown band condition "${band.requirement.condition}"`, {
                                    band: band
                                })
                                return false
                        }
                    case 'cartItems':

                        // transform ids for evaluating
                        const cartProductIds = cartItems.map(item => item.variant_id)
                        const conditionProductIds = band.requirement.value.map((item) => {
                            return item.variants.map((variant) => {
                                return parseInt(variant.id.replace('gid://shopify/ProductVariant/', ''))
                            })
                        }).flat()

                        const intersect = cartProductIds.filter(p => conditionProductIds.includes(p))

                        switch (band.requirement.condition) {
                            case 'hasAny':
                                return intersect.length > 0
                            case 'hasNone':
                                return intersect.length === 0
                            default:
                                Logger.error(`Unknown band condition "${band.requirement.condition}"`, {
                                    band: band
                                })
                                return false
                        }
                    case 'cartWeight':
                        switch (band.requirement.condition) {
                            case 'between':
                                return (cartWeight > band.requirement.value.min) && (cartWeight < band.requirement.value.max)
                            case 'greaterThan':
                                return cartWeight > band.requirement.value
                            case 'lessThan':
                                return cartWeight < band.requirement.value
                            default:
                                Logger.error(`Unknown band condition "${band.requirement.condition}"`, {
                                    band: band
                                })
                                return false
                        }
                    case 'cartDateRange':
                        switch (band.requirement.condition) {
                            case 'between':
                                const dateRange = {
                                    start: zonedTimeToUtc(band.requirement.value.start, APP_TIMEZONE),
                                    end: zonedTimeToUtc(band.requirement.value.end, APP_TIMEZONE)
                                }
                                return checkDateBetween(nominatedDate, dateRange)
                            default:
                                Logger.error(`Unknown band condition "${band.requirement.condition}"`, {
                                    band: band
                                })
                                return false
                        }
                    default:
                        Logger.error(`Unknown band type "${band.requirement.type}"`, {
                            band: band
                        })
                        return false
                }
            } catch (e) {
                Logger.error('Error evaluating shipping method band', e)
                return false
            }
        }).sort((a, b) => {
            return a.priority - b.priority
        })
    },
    getMethodRateForCart(cartItems: IShippingRateRequestBodyItem[], cartTotal: number, cartWeight: number = 0, nominatedDate: Date): number {
        const applicableBands = this.getApplicableBandsForCart(cartItems, cartTotal, cartWeight, nominatedDate)

        if (applicableBands.length > 0) {
            try {
                // get the relevant band with the highest priority
                const priorityBand = applicableBands[0]

                // apply the band
                switch (priorityBand.cost.type) {
                    case 'fixedCost':
                        return priorityBand.cost.value
                }
            } catch (e) {
                Logger.error('Failed to determine band priority')
            }
        } else {
            return this.method.price
        }
    },
    calculateDeliveryPromise(from: Date, now: Date, blockedMethodDates: IBlockedDate[]) {

        const DAYS_IN_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

        let dispatch = from
        let foundDispatch = false

        while (!foundDispatch) {

            dispatch = setDate(dispatch, {
                hours: this.method.dispatch_days[DAYS_IN_WEEK[dispatch.getDay()]].cutoff.split(':')[0],
                minutes: 0,
                seconds: 0,
                milliseconds: 0
            })

            if (
                this.method.dispatch_days[DAYS_IN_WEEK[dispatch.getDay()]].enabled &&
                isBefore(now, dispatch)
            ) {
                foundDispatch = true
            } else {
                dispatch = addDays(dispatch, 1)
            }
        }
        /**
         * Determine if date is a shipping method specific blocked dates
         *
         * @param date
         * @param daysFromDispatch
         * @param blockedDates
         */
        const deliveryDateBlocked = (date: Date, blockedMethodDates: IBlockedDate[]): Boolean => {

            const blockedDates = blockedMethodDates.filter(methodBlockDate => {
                return checkDateBetween(date, methodBlockDate)
            })
            return blockedDates.length > 0
        }

        /**
         * Recursively determine earliest delivery date from the calculated earliest dispatch date
         * Exclude shipping method specific blocked dates
         *
         * @param date
         * @param daysFromDispatch
         * @param blockedDates
         */
        const determineDelivery = (date: Date, daysFromDispatch, blockedMethodDates: IBlockedDate[]): Date|null => {

            /**
             * Express methods can and should only be able to fulfil on dates with a lead time matching the configured promise_start
             */
            if (
                this.isExpressMethod() &&
                daysFromDispatch > this.method.promise_start
            ) {
                return null
            }

            /**
             * If the day in scope is enabled 
             * && it's being fulfilled inline the configured promise start 
             * && that day has not been specifically blocked
             * then we've found the earliest dispatch date
             */
            if (
                this.method.delivery_days[DAYS_IN_WEEK[date.getDay()]].enabled &&
                daysFromDispatch >= this.method.promise_start &&
                !deliveryDateBlocked(date, blockedMethodDates)
            ) {
                return date
            } else {

                // "only_promise_delivery_days" field will need to be added a typescript interfaces & FE app
                if (this.method.only_promise_delivery_days && this.method.delivery_days[DAYS_IN_WEEK[date.getDay()]].enabled) {
                    daysFromDispatch++
                } else if (!this.method.only_promise_delivery_days) {
                    daysFromDispatch++
                }

                /**
                 * Try again
                 */
                return determineDelivery(
                    addDays(date, 1),
                    daysFromDispatch, 
                    blockedMethodDates
                )
            }
        }
        const delivery = determineDelivery(dispatch, 0, blockedMethodDates)

        if (!delivery) {
            return
        } else {
            return {
                from: delivery
            }
        }
    },
    isExpressMethod() {
        return (method.promise_start === method.promise_end)
    },
})

export default ShippingMethodModel
