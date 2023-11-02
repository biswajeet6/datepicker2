import {INextApiRequest} from '@/app/types/api'
import {NextApiResponse} from 'next'
import withApp from '@/app/middleware/withApp'
import {connectToDatabase} from '@/app/utils/mongo'
import {startOfDay, subDays} from 'date-fns'

/**
 * Clean up any blocked dates & orders which have expired
 * Backdated by a day so we can cover all timezones without having to do any locale conversions
 * @param req
 * @param res
 */
const handler = async (req: INextApiRequest, res: NextApiResponse) => {

    const mongo = await connectToDatabase()

    // delete any blocked dates which have expired
    await mongo.client.db().collection('blocked_dates').deleteMany({
        end: {
            $lte: startOfDay(subDays(new Date(), 1))
        }
    })

    // delete any orders which have expired
    await mongo.client.db().collection('orders').deleteMany({
        nominated_date: {
            $lte: startOfDay(subDays(new Date(), 1))
        }
    })

    return res.json({
        message: 'success'
    })
}

export default withApp(handler, {
    guards: ['realm']
})