export interface IEventOrders {
	version: string
	id: string
	"detail-type": string
	source: string
	account: string
	time: Date
	region: string
	resources: any[]
	detail: IEventOrdersDetail
}

export interface IEventOrdersDetail {
	payload: IEventOrdersPayload
	metadata: IEventOrdersMetadata
}

export interface IEventOrdersMetadata {
	"Content-Type": string
	"X-Shopify-Topic": string
	"X-Shopify-Shop-Domain": string
	"X-Shopify-Order-Id": string
	"X-Shopify-Test": string
	"X-Shopify-Hmac-SHA256": string
	"X-Shopify-Webhook-Id": string
	"X-Shopify-API-Version": string
}

export interface IEventOrdersPayload {
	id: number
	email: string
	closed_at: null
	created_at: Date
	updated_at: Date
	number: number
	note: string
	token: string
	gateway: string
	test: boolean
	total_price: string
	subtotal_price: string
	total_weight: number
	total_tax: string
	taxes_included: boolean
	currency: IEventOrdersCurrency
	financial_status: string
	confirmed: boolean
	total_discounts: string
	total_line_items_price: string
	cart_token: null
	buyer_accepts_marketing: boolean
	name: string
	referring_site: null
	landing_site: null
	cancelled_at: null
	cancel_reason: null
	total_price_usd: string
	checkout_token: null
	reference: null
	user_id: number
	location_id: null
	source_identifier: null
	source_url: null
	processed_at: Date
	device_id: null
	phone: null
	customer_locale: string
	app_id: number
	browser_ip: null
	landing_site_ref: null
	order_number: number
	discount_applications: any[]
	discount_codes: any[]
	note_attributes: any[]
	payment_gateway_names: string[]
	processing_method: string
	checkout_id: null
	source_name: string
	fulfillment_status: null
	tax_lines: IEventOrdersTaxLine[]
	tags: string
	contact_email: string
	order_status_url: string
	presentment_currency: IEventOrdersCurrency
	total_line_items_price_set: IEventOrdersSet
	total_discounts_set: IEventOrdersSet
	total_shipping_price_set: IEventOrdersSet
	subtotal_price_set: IEventOrdersSet
	total_price_set: IEventOrdersSet
	total_tax_set: IEventOrdersSet
	line_items: IEventOrdersLineItem[]
	fulfillments: any[]
	refunds: any[]
	total_tip_received: string
	original_total_duties_set: null
	current_total_duties_set: null
	admin_graphql_api_id: string
	shipping_lines: any[]
	billing_address: IEventOrdersAddress
	shipping_address: IEventOrdersAddress
	customer: IEventOrdersCustomer
}

export interface IEventOrdersAddress {
	first_name: string
	address1: string
	phone: string
	city: string
	zip: string
	province: null | string
	country: string
	last_name: string
	address2: null | string
	company: null | string
	latitude?: number
	longitude?: number
	name: string
	country_code: string
	province_code: null
	id?: number
	customer_id?: number
	country_name?: string
	default?: boolean
}

export enum IEventOrdersCurrency {
	Gbp = "GBP",
}

export interface IEventOrdersCustomer {
	id: number
	email: string
	accepts_marketing: boolean
	created_at: Date
	updated_at: Date
	first_name: string
	last_name: string
	orders_count: number
	state: string
	total_spent: string
	last_order_id: number
	note: string
	verified_email: boolean
	multipass_identifier: null
	tax_exempt: boolean
	phone: string
	tags: string
	last_order_name: string
	currency: IEventOrdersCurrency
	accepts_marketing_updated_at: Date
	marketing_opt_in_level: null
	admin_graphql_api_id: string
	default_address: IEventOrdersAddress
}

export interface IEventOrdersLineItem {
	id: number
	variant_id: number
	title: string
	quantity: number
	sku: string
	variant_title: string
	vendor: string
	fulfillment_service: string
	product_id: number
	requires_shipping: boolean
	taxable: boolean
	gift_card: boolean
	name: string
	variant_inventory_management: string
	properties: any[]
	product_exists: boolean
	fulfillable_quantity: number
	grams: number
	price: string
	total_discount: string
	fulfillment_status: null
	pre_tax_price: string
	price_set: IEventOrdersSet
	pre_tax_price_set: IEventOrdersSet
	total_discount_set: IEventOrdersSet
	discount_allocations: any[]
	duties: any[]
	admin_graphql_api_id: string
	tax_lines: IEventOrdersTaxLine[]
}

export interface IEventOrdersSet {
	shop_money: IEventOrdersMoney
	presentment_money: IEventOrdersMoney
}

export interface IEventOrdersMoney {
	amount: string
	currency_code: IEventOrdersCurrency
}

export interface IEventOrdersTaxLine {
	title: string
	price: string
	rate: number
	price_set: IEventOrdersSet
}
