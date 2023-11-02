import withApp from '@/app/middleware/withApp'
import {INextApiRequest} from '@/app/types/api'
import {NextApiResponse} from 'next'

const handle = async (req: INextApiRequest, res: NextApiResponse) => {
    return res.json(req.store.config)
}

export default withApp(handle, {
    guards: ['jwt']
})