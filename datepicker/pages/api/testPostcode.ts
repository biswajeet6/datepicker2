import withApp from '@/app/middleware/withApp'
import PostcodeParser from '@/app/utils/postcodeParser'
import {INextApiRequest} from '@/app/types/api'
import {NextApiResponse} from 'next'
import determineRegion from '@/app/utils/aggregator/determineRegion'

const handle = async (req: INextApiRequest, res: NextApiResponse) => {

    const body = JSON.parse(req.body)

    let {postcode} = body

    // to upper
    postcode = postcode.toUpperCase()

    // attempt to parse the postcode
    const parsedPostcode = PostcodeParser.parse(postcode)

    // attempt to match a region
    let matchedRegion = null
    if (parsedPostcode) {
        try {
            matchedRegion = await determineRegion({
                query: {
                    postcode: parsedPostcode,
                    storeId: req.store._id,
                    lineItems: [],
                }
            })
        } catch (e) {
            console.error(e)
        }
    } else {
        return res.status(422).json({
            message: `Invalid postcode ${postcode}`
        })
    }

    // if we have got to here with no matched region then something is wrong
    if (!matchedRegion) {
        console.error('Failed to match region')
    }

    return res.json({
        originalPostcode: postcode,
        parsedPostcode: parsedPostcode,
        matchedRegion: matchedRegion
    })
}

export default withApp(handle, {
    guards: ['jwt']
})