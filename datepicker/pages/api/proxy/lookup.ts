import Aggregator from '@/app/utils/aggregator/aggregator'
import AggregationError from '@/app/utils/aggregator/AggregationError'
import PostcodeParser from '@/app/utils/postcodeParser'
import {INextApiRequest} from '@/app/types/api'
import {NextApiResponse} from 'next'
import ApiResponse from '@/app/utils/apiResponse'
import Logger from '@/app/utils/logger'
import roll from '@/app/utils/rollbarLogger'
import withApp from '@/app/middleware/withApp'

const handle = async (req: INextApiRequest, res: NextApiResponse) => {

    let {shop} = req.query
    let {postcode, lineItems} = req.body

    if (!lineItems) {
        lineItems = [];
    }

    if (!postcode || !shop) return res.status(422).json({
        message: 'missing params'
    })

    try {
        const aggregator = Aggregator({
            query: {
                storeId: shop.toString(),
                postcode: PostcodeParser.parse(postcode.toString().toUpperCase()),
                lineItems: lineItems,
            }
        })

        const result = await aggregator.aggregate()

        return await ApiResponse(res).send(result)
    } catch (error) {
        roll.error(error, {
            storeId: shop.toString(),
            postcode: postcode.toString().toUpperCase(),
            lineItems: lineItems,
        })
        Logger.error(error, {
            storeId: shop.toString(),
            postcode: postcode.toString().toUpperCase(),
            lineItems: lineItems,
        })

        if (error.name === 'AggregationError') {
            return await ApiResponse(res).send(error, 422)
        }

        return await ApiResponse(res).send({
            message: 'Internal Server Error'
        }, 500)
    }
}

export default withApp(handle, {
    guards: ['proxy']
})
