import withApp from '@/app/middleware/withApp'
import {INextApiRequest} from '@/app/types/api'
import {NextApiResponse} from 'next'

const handle = async (req: INextApiRequest, res: NextApiResponse) => {

    // remove any sensitive data
    delete req.store.token
    delete req.store.webhook_subscriptions
    delete req.store.carrier_service

    return res.json(req.store)
}

export default withApp(handle, {
    guards: ['jwt']
})