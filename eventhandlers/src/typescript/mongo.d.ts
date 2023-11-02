export interface IOrderLineItem {
	id: string
	variant_id: string
	quantity: number
	line_date?: string
}

export interface IOrderNoteAttribute {
	name: string,
	value: string
}

export interface ITagHistoryItem {
	tags: string[]
	timestamp: number
}

export interface IOrder {
	_id?: string
	store_id: string
	order_id: string
	internal_status: 'processing' | 'processed'
	internal_message: string
	internal_retry: number
	order_number: string
	tags: string[]
	line_items: IOrderLineItem[]
	note_attributes: IOrderNoteAttribute[]
	shipping_lines: any[] // @todo type it
	shipping_method: string
	postcode: string
	region_id: string | null
	local_pickup: boolean
	externally_shipped: boolean
	tag_history: ITagHistoryItem[]
	nominated_date: Date | null
	last_modified: Date
}