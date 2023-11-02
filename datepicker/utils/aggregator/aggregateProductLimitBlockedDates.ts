import {IAggregatedBlockedDate, IParams} from '@/app/utils/aggregator/types'
import {IRule} from '@/app/types/store'
import methods from '../../atlas'

/**
 * This function is used to determine if there are any blocked dates imposed by relevant rules with product unit level daily limits
 *
 * @param params
 * @param rules
 */
const aggregateProductLimitBlockedDates = async (params: IParams, today: Date, rules: IRule[]): Promise<IAggregatedBlockedDate[]> => {
    let blockedDates: IAggregatedBlockedDate[] = []
    const productIds: string[] = []

    // create array of rules which have product unit level limits
    const relevantRules: IRule[] = rules.filter(rule => rule.production_limits.product_ids.length > 0)

    // build array of product ids (removing duplicates) to query for
    relevantRules.forEach((rule) => {
        const intersect = rule.production_limits.product_ids.filter(id => params.query.lineItems.map(lineItem => lineItem.productId.toString()).indexOf(id) !== -1)

        if (intersect.length) {
            intersect.forEach((id) => {
                if (productIds.indexOf(id) === -1) {
                    productIds.push(id.replace('gid://shopify/Product/', ''))
                }
            })
        }
    })

    if (productIds.length) {

        // retrieve any dates which are exceeding product level limits imposed by the relevant rules
        const exceedingDates = await methods.order.exceedingProductUnitLimits(
            params.query.storeId,
            today,
            productIds,
            relevantRules.map(rule => rule._id)
        )

        // push blocked dates
        if (exceedingDates.length) {
            exceedingDates.forEach((exceedingDate) => {
                blockedDates.push({
                    date: exceedingDate._id.nominated_date,
                })
            })
        }
    }

    return blockedDates
}

export default aggregateProductLimitBlockedDates