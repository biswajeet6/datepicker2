import {checkHmacValidity} from 'shopify-hmac-validation'
import methods from '../../atlas'
import {DEFAULT_REDIRECT_PATH} from '@/app/consts/app'
import withApp from '@/app/middleware/withApp'
import {INextApiRequest} from '@/app/types/api'
import {NextApiResponse} from 'next'

const createRedirectUrl = (shop: string, apiKey: string, type: string) => {
    return `https://${shop}/admin/oauth/authorize?client_id=${apiKey}&scope=${process.env.SHOPIFY_APP_SCOPES}&redirect_uri=${process.env.APP_URL}/${type}`
}

const handle = async (req: INextApiRequest, res: NextApiResponse) => {

    const body = JSON.parse(req.body)

    if (!body.query.shop) return res.status(429).json({
        message: 'Missing parameters'
    })

    const {shop} = body.query

    const apiKey = process.env.SHOPIFY_API_KEY
    const apiSecret = process.env.SHOPIFY_API_SECRET

    const hmacValidity = checkHmacValidity(apiSecret, body.query)

    if (!hmacValidity) {
        return res.status(401).json({
            message: 'Invalid request'
        })
    }

    // attempt to retrieve the store record
    // attempt to get the store
    const store = await methods.store.getById(shop)

    return res.json({redirect: createRedirectUrl(shop, apiKey, store ? DEFAULT_REDIRECT_PATH.replace('/', '') : 'install')})
}

export default withApp(handle)