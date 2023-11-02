import {IRegion, IRule} from '@/app/types/store'
import methods from '../../atlas'
import {IParams} from '@/app/utils/aggregator/types'
import {startOfDay} from 'date-fns'
import {zonedTimeToUtc} from 'date-fns-tz'
import {APP_TIMEZONE} from '@/app/consts/app'

const determineRules = async (
    params: IParams,
    region: IRegion
): Promise<IRule[]> => {

    const today = zonedTimeToUtc(startOfDay(new Date()), APP_TIMEZONE)

    const rules = await methods.rule.query(params.query.storeId, today)

    return rules.filter((rule) => {
        let applies = true

        if (rule.conditions.region_based.enabled) {
            switch (rule.conditions.region_based.type) {
                case 'in':
                    if (!rule.conditions.region_based.region_ids.map(regionId => regionId.toString()).includes(region._id.toString())) {
                        applies = false
                    }
                    break;
                case 'not_in':
                    if (rule.conditions.region_based.region_ids.map(regionId => regionId.toString()).includes(region._id.toString())) {
                        applies = false
                    }
                    break;
            }
        }

        if (rule.conditions.product_based.enabled) {
            const intersect = params.query.lineItems.map(lineItem => lineItem.productId).filter(p => rule.conditions.product_based.product_ids.includes(p))

            switch (rule.conditions.product_based.type) {
                case 'all':
                    if (intersect.length !== rule.conditions.product_based.product_ids.length) {
                        applies = false
                    }
                    break;
                case 'at_least_one':
                    if (intersect.length === 0) {
                        applies = false
                    }
                    break;
                case 'none':
                    if (intersect.length > 0) {
                        applies = false
                    }
                    break;
            }
        }

        return applies
    })
}

export default determineRules