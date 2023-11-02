'use strict'

import 'source-map-support/register'
import {IEventOrders} from '../../typescript'
import {Context} from 'aws-lambda'
import transformOrderFromEvent from '@libs/transformOrderFromEvent'
import mongo from '@libs/mongo'

const orderCreate = async (event: IEventOrders, context: Context) => {

	context.callbackWaitsForEmptyEventLoop = false

	console.log(`=> handling ${event.detail.metadata['X-Shopify-Topic']} event - order: ${event.detail.payload.id}`)

	console.log(JSON.stringify(event.detail))

	const order = transformOrderFromEvent(event)

	if (order) {

		const db = await mongo.db(process.env.MONGO_DB_CONNECTION_STRING)

		console.log(`=> inserting order: ${event.detail.payload.id}`)

		await db.collection('orders').insertOne(order)

		console.log(`=> successfully handled ${event.detail.metadata['X-Shopify-Topic']} event`)
	} else {
		console.log(`=> failed to transform order - skipping`)
	}

	return
}

export const main = orderCreate
