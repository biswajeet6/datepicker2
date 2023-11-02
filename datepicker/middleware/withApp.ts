import {NextApiResponse} from 'next'
import jwtGuard from '@/app/middleware/guards/jwt'
import proxyGuard from '@/app/middleware/guards/proxy'
import realmGuard from '@/app/middleware/guards/realm'
import hmacGuard from '@/app/middleware/guards/hmac'
import {INextApiRequest} from '@/app/types/api'
import methods from '../atlas'
import Logger from '@/app/utils/logger'
import ApiResponse from '@/app/utils/apiResponse'
import RealmApiError from '@/app/utils/errors/RealmApiError'

interface IOptions {
    guards: string[]
}

const guards = {
    jwt: jwtGuard,
    proxy: proxyGuard,
    realm: realmGuard,
    hmac: hmacGuard,
}

const withApp = (handler, options: IOptions = {
    guards: []
}) => {
    return async (req: INextApiRequest, res: NextApiResponse) => {
        try {

            if (process.env.NODE_ENV !== 'test') {
                for (let guard of options.guards) {
                    await guards[guard](req)
                }
            }

            // attempt to attach the store in session to the request
            if (req.body) {
                try {
                    const body = JSON.parse(req.body)
                    if (body.storeId) {
                        req.store = await methods.store.getById(body.storeId)
                    } else {
                        req.store = null
                    }
                } catch (e) {
                    // @todo ignore?
                }
            }

            return await handler(req, res)
        } catch (e) {

            Logger.error(e)

            if (e instanceof RealmApiError) {
                return await ApiResponse(res).send({
                    message: e.message,
                    retry: e.retry,
                }, e.statusCode)
            }

            if (e.message === 'unauthorized') {

                Logger.error('Failed authentication', {
                    options: options,
                })

                return await ApiResponse(res).send({
                    message: 'Unauthenticated'
                }, 401)
            }

            return await ApiResponse(res).send({
                message: 'Internal server error'
            }, 500)
        }
    }
}

export default withApp