import withApp from '@/app/middleware/withApp'
import {INextApiRequest} from '@/app/types/api'
import {NextApiResponse} from 'next'

const handle = async (req: INextApiRequest, res: NextApiResponse) => {
    return res.json(req.store.webhook_subscriptions)
}

export default withApp(handle, {
    guards: ['jwt']
})