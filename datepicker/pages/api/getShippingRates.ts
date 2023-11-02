import ShippingAggregator from '@/app/utils/aggregator/shippingAggregator'
import {IShippingRate, IShippingRateRequestBody} from '@/app/utils/aggregator/types'
import withApp from '@/app/middleware/withApp'
import {INextApiRequest} from '@/app/types/api'
import {NextApiResponse} from 'next'
import methods from '../../atlas'
import ApiResponse from '@/app/utils/apiResponse'
import Logger from '@/app/utils/logger'
import roll from '@/app/utils/rollbarLogger'

const handle = async (req: INextApiRequest, res: NextApiResponse) => {
    
    if (process.env.STAGE && process.env.STAGE.toLowerCase().indexOf('production') === -1) {
        roll.info('Getting Shipping Rates', {
                'store': req.headers['x-shopify-shop-domain'],
                'bodyRate': req.body.rate
            }
        )
    }
    
    const body: IShippingRateRequestBody = req.body

    const shop = req.headers['x-shopify-shop-domain']

    if (!shop) {
        roll.info('Missing Params')
        return await ApiResponse(res).send({
            message: 'missing params'
        }, 422)
    }

    let rates: IShippingRate[] = []

    try {
        const store = await methods.store.getById(shop.toString())

        if (!store) {
            roll.info('No Store')
            return await ApiResponse(res).send({
                rates: rates
            })
        }

        // if the carrier integration is in testing mode and the company does not match the criteria, do not return any rates
        if (
            store.config.carrier_test_mode_enabled &&
            store.config.carrier_test_mode_match !== null
        ) {
            if (
                !body.rate.destination.address1 ||
                !body.rate.destination.address1.includes(store.config.carrier_test_mode_match)
            ) {
                return await ApiResponse(res).send({
                    rates: rates
                })
            } else {
                Logger.info({
                    message: 'processing test request',
                    headers: req.headers,
                    body: req.body,
                })
            }
        }

        const shippingAggregator = ShippingAggregator({
            query: {
                storeId: shop.toString(),
                rate: body
            }
        })

        rates = await shippingAggregator.aggregate()

        if (process.env.STAGE && process.env.STAGE.toLowerCase().indexOf('production') === -1) {
            roll.info('Returning Shipping Rates', rates)
        }
        if (!rates) {

            Logger.warn('No shipping methods found after filtering')
            roll.warn('No shipping methods found after filtering')

            return await ApiResponse(res).send({
                rates: rates
            })
        }

        return await ApiResponse(res).send({
            rates: rates
        })
    } catch (e) {

        Logger.error(e)
        roll.error(e)

        return await ApiResponse(res).send({
            rates: rates
        })
    }
}

export default withApp(handle)