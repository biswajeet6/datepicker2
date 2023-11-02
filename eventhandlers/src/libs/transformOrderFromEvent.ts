import {IOrder, IOrderLineItem} from '@typescript/mongo'
import {IEventOrders, IEventOrdersLineItem} from '../typescript'

const requiresShipping = (lineItems: IEventOrdersLineItem[]): boolean => {
	return lineItems.filter(item => item.requires_shipping).length > 0
}

/**
 * If the first shipping like source is not "Cutters" then the selected shipping method will be external.
 * Either from Shopify, Local pickup or another app.
 *
 * @param event
 */
const isExternallyShipped = (event: IEventOrders) => {

	if (event.detail.payload.shipping_lines.length === 0) {
		return false
	}

	// local pickup orders
	if (typeof event.detail.payload.shipping_address === 'undefined') {
		return false
	}

	// get first shipping line
	const firstLine = event.detail.payload.shipping_lines[0]

	return firstLine.source.toLowerCase() !== 'cutters'
}

const isLocalPickup = (event: IEventOrders) => {
	return typeof event.detail.payload.shipping_address === 'undefined';
}

const transformOrderFromEvent = (event: IEventOrders): IOrder|null => {

	if (!requiresShipping(event.detail.payload.line_items)) return

	const storeId = event.detail.metadata['X-Shopify-Shop-Domain']

	const date = new Date()

	let postcode = isLocalPickup(event) ? null : event.detail.payload.shipping_address.zip

	return {
		store_id: storeId,
		order_id: event.detail.payload.id.toString(),
		internal_status: 'processing',
		internal_message: null,
		internal_retry: 0,
		order_number: event.detail.payload.order_number.toString(),
		region_id: null,
		tags: event.detail.payload.tags.split(', '),
		line_items: event.detail.payload.line_items.map(line_item => {
			const item: IOrderLineItem = {
				id: line_item.product_id.toString(),
				variant_id: line_item.variant_id.toString(),
				quantity: line_item.quantity,
				line_date: line_item.properties.find(x => x.name === '_nominated_date')?.value.toString(),
			}
			return item
		}),
		shipping_lines: event.detail.payload.shipping_lines,
		shipping_method: null,
		postcode: postcode,
		note_attributes: event.detail.payload.note_attributes,
		nominated_date: null,
		externally_shipped: isExternallyShipped(event),
		local_pickup: isLocalPickup(event),
		tag_history: [],
		last_modified: date,
	}
}

export default transformOrderFromEvent
