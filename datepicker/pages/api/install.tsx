import methods from '../../atlas'
import ShopifyApi from '@/app/utils/shopifyApi'
import {DEFAULT_REDIRECT_PATH} from '@/app/consts/app'
import createDefaultRegion from '../../helpers/createDefaultRegion'
import createDefaultStore from '../../helpers/createDefaultStore'
import withApp from '@/app/middleware/withApp'
import {INextApiRequest} from '@/app/types/api'
import {NextApiResponse} from 'next'

const handle = async (req: INextApiRequest, res: NextApiResponse) => {

    const body = JSON.parse(req.body)

    if (!body.storeId || !body.code) return res.status(429).json({
        success: false,
        message: 'Missing parameters'
    })

    const {storeId, code} = body

    // attempt to get the store
    const store = await methods.store.getById(storeId)

    // early return if its already installed
    if (store) return res.json({
        success: true,
        redirect: DEFAULT_REDIRECT_PATH,
    })

    const token = await ShopifyApi(storeId).getAccessToken(process.env.SHOPIFY_API_KEY, process.env.SHOPIFY_API_SECRET, code)

    if (!token) {
        console.error('Failed to exchange shopify token')

        return res.status(429).json({
            success: false,
            message: 'Failed to exchange shopify token'
        })
    }

    // create new store document
    const newStore = createDefaultStore()
    newStore._id = storeId
    newStore.token = token

    await methods.store.create(newStore)

    // create default region
    await methods.region.insert(createDefaultRegion(storeId))

    return res.json({
        success: true,
        redirect: DEFAULT_REDIRECT_PATH,
    })
}

export default withApp(handle)