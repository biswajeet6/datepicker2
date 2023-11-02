import withApp from '@/app/middleware/withApp'
import {IBlockedDate} from '@/app/types/store'
import methods from '../../../atlas'
import {INextApiRequest} from '@/app/types/api'
import {NextApiResponse} from 'next'

const handle = async (req: INextApiRequest, res: NextApiResponse) => {

    const body = JSON.parse(req.body)

    const blockedDate: IBlockedDate = body.blockedDate

    const result = await methods.blocked_date.update(req.store._id, blockedDate)

    if (result) {
        return res.json({
            message: 'success',
            blockedDate: result
        })
    }

    return res.json([])
}

export default withApp(handle, {
    guards: ['jwt']
})