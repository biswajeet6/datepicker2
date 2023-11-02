import withApp from '@/app/middleware/withApp'
import methods from '../../../atlas'
import createDefaultShippingMethod from '../../../helpers/createDefaultShippingMethod'
import {INextApiRequest} from '@/app/types/api'
import {NextApiResponse} from 'next'

const handle = async (req: INextApiRequest, res: NextApiResponse) => {

    const body = JSON.parse(req.body)

    const {name} = body

    const result = await methods.shippingMethod.insert(createDefaultShippingMethod(req.store._id, name))

    if (result) return res.json({
        id: result.insertedId
    })

    return res.status(500).json({
        message: 'Failed to add new shippingMethod'
    })
}

export default withApp(handle, {
    guards: ['jwt']
})