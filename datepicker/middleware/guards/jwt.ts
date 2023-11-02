import {NextApiRequest} from 'next'
import isVerified from 'shopify-jwt-auth-verify'

const guard = async (req: NextApiRequest): Promise<void> => {
    if (!req.headers.authorization) {
        throw new Error('unauthorized')
    }

    if (!isVerified(req.headers.authorization, process.env.SHOPIFY_API_SECRET)) {
        throw new Error('unauthorized')
    }
}

export default guard