import withApp from '@/app/middleware/withApp'
import methods from '../../../atlas'
import {INextApiRequest} from '@/app/types/api'
import {NextApiResponse} from 'next'

const handle = async (req: INextApiRequest, res: NextApiResponse) => {

    const result = await methods.region.getByStoreId(req.store._id)

    if (result) {
        const data = await result.toArray()
        return res.json(data)
    }

    return res.json([])
}

export default withApp(handle, {
    guards: ['jwt']
})