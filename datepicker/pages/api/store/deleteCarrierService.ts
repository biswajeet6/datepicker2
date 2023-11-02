import withApp from '@/app/middleware/withApp'
import ShopifyApi from '@/app/utils/shopifyApi'
import methods from '../../../atlas'
import createDefaultStore from '../../../helpers/createDefaultStore'
import {INextApiRequest} from '@/app/types/api'
import {NextApiResponse} from 'next'

const handle = async (req: INextApiRequest, res: NextApiResponse) => {

    if (!req.store.carrier_service.id) return res.status(429).json({
        message: 'Carrier service not enabled'
    })

    const response = await ShopifyApi(req.store._id, req.store.token).deleteCarrierService(req.store.carrier_service.id)

    if (response) {
        if (response.errors) return res.status(429).json({
            message: response.errors
        })

        // @todo add error handling
        await methods.store.updateCarrierService(req.store._id, createDefaultStore().carrier_service)

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