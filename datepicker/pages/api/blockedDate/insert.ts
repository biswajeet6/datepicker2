import withApp from '@/app/middleware/withApp'
import {IBlockedDate} from '@/app/types/store'
import methods from '../../../atlas'
import {INextApiRequest} from '@/app/types/api'
import {NextApiResponse} from 'next'

const handle = async (req: INextApiRequest, res: NextApiResponse) => {

    const body = JSON.parse(req.body)

    const blockedDate: IBlockedDate = body.blockedDate

    blockedDate.store_id = req.store._id

    const result = await methods.blocked_date.insert(blockedDate)

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