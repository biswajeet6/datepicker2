import withApp from '@/app/middleware/withApp'
import methods from '../../../atlas'
import {INextApiRequest} from '@/app/types/api'
import {NextApiResponse} from 'next'

const handle = async (req: INextApiRequest, res: NextApiResponse) => {

    const limit = 20
    const page = 1

    const type = 'default'

    const result = await methods.rule.getByStoreId(req.store._id, type, limit, page)

    if (result) {
        const numPages = Math.ceil(await result.count() / limit)
        const data = await result.toArray()
        return res.json({
            maxPage: numPages,
            limit: limit,
            length: data.length,
            hasNext: (page !== numPages),
            page: page,
            data: data
        })
    }

    return res.json([])
}

export default withApp(handle, {
    guards: ['jwt']
})