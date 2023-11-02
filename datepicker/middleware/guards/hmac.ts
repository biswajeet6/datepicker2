import crypto from 'crypto'
import {NextApiRequest} from 'next'

const guard = async (req: NextApiRequest): Promise<void> => {

    const shop = req.headers['x-shopify-shop-domain']
    const hmac = req.headers['x-shopify-hmac-sha256']

    if (!shop || !hmac) {
        throw new Error('unauthorized')
    }

    const hash = crypto.createHmac('sha256', process.env.SHOPIFY_API_SECRET).update(JSON.stringify(req.body)).digest('base64')

    if (hash !== hmac) {
        throw new Error('unauthorized')
    }
}

export default guard