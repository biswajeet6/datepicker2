import {NextApiRequest} from 'next'

const guard = async (req: NextApiRequest): Promise<void> => {

    if (!req.headers.authorization) {
        throw new Error('unauthorized')
    }

    let token
    try {
        token = req.headers.authorization.split(' ')[1]
    } catch (e) {
        throw new Error('unauthorized')
    }

    if (token !== process.env.APP_AUTHENTICATION_KEY) {
        throw new Error('unauthorized')
    }
}

export default guard