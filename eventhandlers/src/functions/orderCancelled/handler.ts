'use strict'

import 'source-map-support/register'
import {IEventOrders} from '../../typescript'
import {Context} from 'aws-lambda'
import {ObjectID} from 'mongodb'
import {IOrder} from '@typescript/mongo'
import mongo from '@libs/mongo'

const orderUpdated = async (event: IEventOrders, context: Context, callback) => {
	context.callbackWaitsForEmptyEventLoop = false

	try {
		console.log(`=> handling ${event.detail.metadata['X-Shopify-Topic']} event`)

		const db = await mongo.db(process.env.MONGO_DB_CONNECTION_STRING)

		const order: IOrder | null = await db.collection('orders').findOne({
			store_id: event.detail.metadata['X-Shopify-Shop-Domain'],
			order_id: event.detail.payload.id.toString()
		})

		if (order) {
			await db.collection('orders').deleteOne({_id: ObjectID(order._id)})

			console.log(`=> successfully handled ${event.detail.metadata['X-Shopify-Topic']} event`)

			callback(null, 'success')
		} else {
			console.log(`=> order ${event.detail.payload.id.toString()} does not exist, ignoring cancellation`)

			callback(null, 'ignored')
		}
	} catch (error) {
		callback(error, 'error')
	}
}

export const main = orderUpdated