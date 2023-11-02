import {handlerPath} from '@libs/handlerResolver'

export default {
	handler: `${handlerPath(__dirname)}/handler.main`,
	events: [
		{
			eventBridge: {
				eventBus: process.env.EVENT_BUS_ARN,
				pattern: {
					account: ['977846025308'],
					detail: {
						metadata: {
							'X-Shopify-Topic': ['orders/cancelled'],
						}
					}
				}
			}
		}
	]
}
