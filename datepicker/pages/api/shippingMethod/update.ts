import withApp from '@/app/middleware/withApp'
import methods from '../../../atlas'
import {INextApiRequest} from '@/app/types/api'
import {NextApiResponse} from 'next'

const handle = async (req: INextApiRequest, res: NextApiResponse) => {

    const body = JSON.parse(req.body)

    const {shippingMethod} = body

    const existing = await methods.shippingMethod.getById(req.store._id, shippingMethod._id)

    if (existing && (existing.service_code !== shippingMethod.service_code)) {
        if (existing.service_code !== shippingMethod.service_code) {

            // update all relevant orders
            await methods.order.replaceServiceCodes(req.store._id, existing, shippingMethod)
        }
    }

    const result = await methods.shippingMethod.update(req.store._id, shippingMethod)

    if (result) {
        return res.json({
            message: 'success',
        })
    }

    return res.status(500).json({
        message: 'Sorry, something went wrong.'
    })
}

export default withApp(handle, {
    guards: ['jwt']
})