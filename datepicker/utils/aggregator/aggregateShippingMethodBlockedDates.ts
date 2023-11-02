import {IAggregatedBlockedDate, IParams} from '@/app/utils/aggregator/types'
import {IShippingMethod} from '@/app/types/store'
import methods from '../../atlas'
import {addDays, isEqual, startOfDay} from 'date-fns'
import ShippingMethodModel from '../../models/ShippingMethod'
import {APP_TIMEZONE} from '@/app/consts/app'
import {zonedTimeToUtc} from 'date-fns-tz'

interface IAggregateMethod {
    id: string
    name: string
    dates: Date[]
    isExpress: boolean
    promiseStart: number
}

const criteriaMatches = (a: IAggregateMethod, b: IAggregateMethod): boolean => {

    if (a.id === b.id) return false

    return a.promiseStart === b.promiseStart
}

const aggregateShippingMethodBlockedDates = async (params: IParams, shippingMethods: IShippingMethod[]): Promise<IAggregatedBlockedDate[]> => {

    const today = zonedTimeToUtc(startOfDay(new Date()), APP_TIMEZONE)

    const blockedDates: IAggregatedBlockedDate[] = []

    const aggregateMethods: IAggregateMethod[] = shippingMethods.map((shippingMethod) => {
        return {
            id: shippingMethod._id,
            name: shippingMethod.name,
            dates: [],
            isExpress: ShippingMethodModel(shippingMethod).isExpressMethod(),
            promiseStart: ShippingMethodModel(shippingMethod).method.promise_start,
        }
    })

    const datesExceedingLimits = await methods.order.exceedingShippingMethodLimit(
        params.query.storeId,
        today,
        shippingMethods.map(method => method.service_code),
    )

    datesExceedingLimits.map((item) => {
        const index = aggregateMethods.findIndex(aggregateMethod => aggregateMethod.id.toString() === item.method._id.toString())

        // do not push dates for next day or same day methods (unless the blocked date is next day or same day)
        if (
            aggregateMethods[index].isExpress &&
            !isEqual(item._id.date, addDays(today, aggregateMethods[index].promiseStart))
        ) {
            return
        }

        aggregateMethods[index].dates.push(item._id.date)
    })

    // now we have aggregated dates blocked per method, filter them and determine whether or not the blocked day can be serviced by another method with matching criteria
    aggregateMethods.forEach((aggregatedMethod) => {

        if (aggregatedMethod.dates.length) {

            // find other methods which match this ones criteria
            let alternateMethods = aggregateMethods.filter(testMethod => criteriaMatches(testMethod, aggregatedMethod))

            if (alternateMethods.length) {

                // check if the alternate methods can service the candidate blocked date
                aggregatedMethod.dates.forEach((candidateBlockedDate) => {

                    let foundAlternateMethodForDate = false

                    alternateMethods.forEach((alternateMethod) => {

                        if (foundAlternateMethodForDate) return

                        if (!alternateMethod.dates.find((date) => {
                            return isEqual(date, candidateBlockedDate)
                        })) {
                            foundAlternateMethodForDate = true
                        }
                    })

                    // if we have not found an alternate method for the candidate date then push this as a blocked day, by this point we should have determined if there is a method which can fulfill it or not
                    if (!foundAlternateMethodForDate) {
                        blockedDates.push({
                            date: candidateBlockedDate
                        })
                    }
                })
            } else {
                aggregatedMethod.dates.forEach((blockedDate) => {
                    blockedDates.push({
                        date: blockedDate
                    })
                })
            }
        }
    })

    return blockedDates
}

export default aggregateShippingMethodBlockedDates
