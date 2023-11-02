import {handlerPath} from '@libs/handlerResolver'

export default {
	handler: `${handlerPath(__dirname)}/handler.main`,
	timeout: 60, // @todo reduce this after debugging and monitoring average timeouts etc
	events: [
		{
			eventBridge: {
				eventBus: process.env.EVENT_BUS_ARN,
				pattern: {
					account: ['977846025308'],
					detail: {
						metadata: {
							'X-Shopify-Topic': ['orders/updated'],
						}
					}
				}
			}
		}
	]
}
