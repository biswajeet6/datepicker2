'use strict'

import 'source-map-support/register'
import {IEventOrders} from '../../typescript'
import {Context} from 'aws-lambda'
import {ObjectID} from 'mongodb'
import transformOrderFromEvent from '@libs/transformOrderFromEvent'
import {IOrder} from '@typescript/mongo'
import mongo from '@libs/mongo'

const orderUpdated = async (event: IEventOrders, context: Context) => {
	context.callbackWaitsForEmptyEventLoop = false

	console.log(`=> handling ${event.detail.metadata['X-Shopify-Topic']} event - order: ${event.detail.payload.id}`)

	console.log(JSON.stringify(event.detail))

	const db = await mongo.db(process.env.MONGO_DB_CONNECTION_STRING)

	console.log(`=> retrieving order: ${event.detail.payload.id}`)

	const order: IOrder | null = await db.collection('orders').findOne({
		store_id: event.detail.metadata['X-Shopify-Shop-Domain'],
		order_id: event.detail.payload.id.toString()
	})

	if (order) {
		const updatedOrder = transformOrderFromEvent(event)

		if (updatedOrder) {

			console.log(`=> updating order: ${event.detail.payload.id}`)

			// update record with any updatable fields
			const updated = await db.collection('orders').updateOne(
				{_id: ObjectID(order._id)},
				{
					$set: {
						tags: updatedOrder.tags,
						line_items: updatedOrder.line_items,
						last_modified: updatedOrder.last_modified,
						note_attributes: updatedOrder.note_attributes,
						shipping_lines: updatedOrder.shipping_lines,
						postcode: updatedOrder.postcode
					}
				}
			)

			if (!updated) {
				throw new Error('order update failed')
			}

			console.log(`=> successfully handled ${event.detail.metadata['X-Shopify-Topic']} event`)
		} else {
			console.log(`=> skipping ${event.detail.metadata['X-Shopify-Topic']} event`)
		}

		return
	} else {
		console.log(`=> order ${event.detail.payload.id.toString()} does not exist, checking for presence of force create tag`)

		if (event.detail.payload.tags.includes('ds-force-create')) {

			console.log('=> force creating order')

			const newOrder = transformOrderFromEvent(event)

			if (newOrder) {

				const db = await mongo.db(process.env.MONGO_DB_CONNECTION_STRING)

				console.log(`=> inserting order: ${event.detail.payload.id}`)

				await db.collection('orders').insertOne(newOrder)

				console.log(`=> successfully handled ${event.detail.metadata['X-Shopify-Topic']} event`)
			} else {
				console.log(`=> failed to transform new order - skipping`)
			}
		} else {
			console.log('=> skipping order')
		}

		return
	}
}

export const main = orderUpdated
