import withApp from '@/app/middleware/withApp'
import {IRule} from '@/app/types/store'
import methods from '../../../atlas'
import {INextApiRequest} from '@/app/types/api'
import {NextApiResponse} from 'next'

const handle = async (req: INextApiRequest, res: NextApiResponse) => {
    const body = JSON.parse(req.body)

    const rule: IRule = body.rule

    rule.store_id = req.store._id

    const result = await methods.rule.insert(rule)

    if (result) {
        return res.json({
            id: result.insertedId
        })
    }

    return res.json([])
}

export default withApp(handle, {
    guards: ['jwt']
})