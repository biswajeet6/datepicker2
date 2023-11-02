import withApp from '@/app/middleware/withApp'
import methods from '../../../atlas'
import {INextApiRequest} from '@/app/types/api'
import {NextApiResponse} from 'next'

const handle = async (req: INextApiRequest, res: NextApiResponse) => {

    const body = JSON.parse(req.body)

    const {name} = body

    const result = await methods.region.insert({
        store_id: req.store._id,
        name: name,
        default: false,
        postcode_filters: [],
        sector_filters: [],
        area_filters: [],
        outcode_filters: [],
        archived: false,
        apply_tags: [],
        apply_attributes: [],
    })

    if (result) return res.json({
        id: result.insertedId
    })

    return res.status(500).json({
        message: 'Failed to add new region'
    })
}

export default withApp(handle, {
    guards: ['jwt']
})