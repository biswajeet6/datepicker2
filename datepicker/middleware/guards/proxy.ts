import crypto from 'crypto'
import {NextApiRequest} from 'next'

const guard = async (req: NextApiRequest): Promise<void> => {
    const query = req.query

    const signature = query.signature

    delete query.signature

    const message = Object.keys(query).map((param) => {
        return `${param}=${query[param]}`
    }).sort().join('')

    const digest = crypto.createHmac('sha256', process.env.SHOPIFY_API_SECRET).update(message).digest('hex')

    if (digest !== signature) {
        throw new Error('unauthorized')
    }
}

export default guard