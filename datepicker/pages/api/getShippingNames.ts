import withApp from '@/app/middleware/withApp'
import {INextApiRequest} from '@/app/types/api'
import {NextApiResponse} from 'next'
import methods from '../../atlas'
import ApiResponse from '@/app/utils/apiResponse'
import Logger from '@/app/utils/logger'
import roll from '@/app/utils/rollbarLogger'

const handle = async (req: INextApiRequest, res: NextApiResponse) => {
  
    const shop = req.headers['x-shopify-shop-domain']
    const ship_code = req.body['bb-code']

    if (!shop || !ship_code) {
        roll.info('Missing Params')
        return await ApiResponse(res).send({
            message: 'missing params'
        }, 422)
    }

    if (ship_code.indexOf('$') > -1) {
      roll.info(`Someone trying to hack shipping name request?? Code sent: ${ship_code}`)
      return await ApiResponse(res).send({
          message: 'badly formatted code'
      }, 422)
  }

    try {
        const store = await methods.store.getById(shop.toString())
        if (!store) {
            roll.info('No Store for shipping name')
            return await ApiResponse(res).send({
              rateName: ''
            })
        }

        const shippingMethodName = await methods.shippingMethod.getByCode(shop.toString(), ship_code.toString())
        if (!shippingMethodName) {
          roll.info(`No Shipping name found for code ${ship_code}`)
          return await ApiResponse(res).send({
            rateName: ''
          })
        }

        return await ApiResponse(res).send({
          rateName: shippingMethodName.name
        })
    } catch (e) {

        Logger.error(e)
        roll.error(e)

        return await ApiResponse(res).send({
          rateName: ''
        })
    }
}

export default withApp(handle)