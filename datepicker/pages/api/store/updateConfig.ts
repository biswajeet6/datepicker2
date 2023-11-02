import methods from '../../../atlas'
import withApp from '@/app/middleware/withApp'
import {INextApiRequest} from '@/app/types/api'
import {NextApiResponse} from 'next'

const handle = async (req: INextApiRequest, res: NextApiResponse) => {

    const body = JSON.parse(req.body)

    const {config} = body

    if (!config) return res.status(429).json({
        message: 'Missing config',
        data: body
    })

    const result = await methods.store.updateConfig(req.store._id, config)

    if (!result) return res.status(500).json({
        message: 'Something went wrong'
    })

    return res.json(config)
}

export default withApp(handle, {
    guards: ['jwt']
})