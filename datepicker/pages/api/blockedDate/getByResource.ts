import withApp from '@/app/middleware/withApp'
import methods from '../../../atlas'
import {INextApiRequest} from '@/app/types/api'
import {NextApiResponse} from 'next'

const handle = async (req: INextApiRequest, res: NextApiResponse) => {

    const body = JSON.parse(req.body)

    const {resourceId} = body

    const result = await methods.blocked_date.getByResourceId(req.store._id, resourceId)

    if (result) {
        return res.json({
            data: result
        })
    }

    return res.json([])
}

export default withApp(handle, {
    guards: ['jwt']
})