import withApp from '@/app/middleware/withApp'
import methods from '../../../atlas'
import {INextApiRequest} from '@/app/types/api'
import {NextApiResponse} from 'next'

const handle = async (req: INextApiRequest, res: NextApiResponse) => {

    const body = JSON.parse(req.body)

    const {regionId, fields} = body

    const result = await methods.region.update(req.store._id, regionId, fields)

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