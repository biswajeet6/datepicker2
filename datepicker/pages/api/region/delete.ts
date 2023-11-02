import withApp from '@/app/middleware/withApp'
import methods from '../../../atlas'
import {INextApiRequest} from '@/app/types/api'
import {NextApiResponse} from 'next'

const handle = async (req: INextApiRequest, res: NextApiResponse) => {

    const body = JSON.parse(req.body)

    const {id} = body

    const result = await methods.region.delete(id, req.store._id)

    if (result) {
        return res.json({
            message: 'success',
            blockedDate: result // @todo wtf?
        })
    }

    return res.json([])
}

export default withApp(handle, {
    guards: ['jwt']
})