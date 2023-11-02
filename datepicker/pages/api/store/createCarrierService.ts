import withApp from '@/app/middleware/withApp'
import methods from "../../../atlas";
import ShopifyApi from "@/app/utils/shopifyApi";
import {INextApiRequest} from '@/app/types/api'
import {NextApiResponse} from 'next'

const handle = async (req: INextApiRequest, res: NextApiResponse) => {

    const response = await ShopifyApi(req.store._id, req.store.token).createCarrierService({
        name: 'Cutters',
        callback_url: `${process.env.APP_URL}/api/getShippingRates`,
        service_discovery: true,
    })

    if (response) {

        if (response.errors) return res.status(429).json({
            message: response.errors
        })

        await methods.store.updateCarrierService(req.store._id, response.carrier_service)

        return res.json({
            message: 'Success'
        })
    }

    return res.status(500).json({
        message: 'Something went wrong'
    })
}

export default withApp(handle, {
    guards: ['jwt']
})