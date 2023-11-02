export interface IOrderTagHistoryItem {
    tags: string[]
    timestamp: number
}

export interface IOrderNoteAttribute {
    name: string,
    value: string
}

export interface IOrderShippingLine {
    code: string
    source?: string
    title?: string
}

export interface IOrderLineItem {
    id: string
    variant_id: string
    quantity: number
    line_date?: string
}

export interface IOrderDocument {
    _id?: string
    store_id: string
    order_id: string
    internal_status: string
    internal_message: string
    order_number: string
    tags: string[]
    last_modified: Date
    shipping_lines: IOrderShippingLine[]
    line_items: IOrderLineItem[]
    shipping_method: string | null
    postcode: string
    note_attributes: IOrderNoteAttribute[]
    region_id: string | null
    externally_shipped: boolean
    local_pickup: boolean
    tag_history: IOrderTagHistoryItem[]
    nominated_date: Date | null
}

export interface IRule {
    _id?: string
    store_id?: string
    title: string
    enabled: boolean
    conditions: {
        region_based: {
            enabled: boolean
            type: 'in' | 'not_in'
            region_ids: string[]
        }
        product_based: {
            enabled: boolean
            type: 'at_least_one' | 'all' | 'none'
            product_ids: string[]
        }
    }
    production_limits: {
        product_ids: string[]
        max_units_per_day: number | null
    }
    offset: number
    active_from: {
        start: Date
        end: Date | null
    }
    archived: boolean
}

export interface IAttribute {
    name: string
    value: string
}

export interface IRegion {
    _id?: string
    store_id?: string
    default: boolean
    name: string
    postcode_filters: string[]
    sector_filters: string[]
    area_filters: string[]
    outcode_filters: string[]
    apply_tags: string[]
    apply_attributes: IAttribute[]
    archived: boolean
}

export interface IShippingMethodDeliveryDay {
    key: string
    label: string
    enabled: boolean
}

export interface IShippingMethodDispatchDay {
    key: string
    label: string
    enabled: boolean
    cutoff: string
}

export interface IBandRequirementCondition {
    key: string
    label: string
    inputType: string
    default: any
}

export interface IBandRequirement {
    key: string
    label: string
    defaultCondition: string
    conditionConnector: string | null
    conditionUnitType: string
    inputConnector: string | null
    conditions: IBandRequirementCondition[]
}

export interface IBandCost {
    type: 'fixedCost'
    label: string
    default: number
    unitType: string
}

export interface ICartCostRequirement {
    type: 'cartCost'
}

export interface IShippingMethodBandRequirement {
    type: 'cartCost' | 'cartItems' | 'cartWeight' | 'cartDateRange'
    condition: string
    value: any
}

export interface IShippingMethodBandCost {
    type: 'fixedCost'
    value: number
}

export interface IShippingMethodBand {
    name: string
    priority: number
    requirement: IShippingMethodBandRequirement
    cost: IShippingMethodBandCost
}

export interface IShippingMethod {
    _id?: string
    store_id: string
    name: string
    enabled: boolean
    type: 'domestic'
    description: string
    service_code: string
    daily_order_limit: number
    required_phone: boolean
    only_promise_delivery_days: boolean
    promise_start: number
    promise_end: number
    price: number
    region_ids: string[]
    conditions: {
        product_based: {
            enabled: boolean
            type: 'at_least_one' | 'all' | 'none' | 'only'
            product_ids: {
                id: string
                variants: {
                    id: string
                }[]
            }[]
        }
        weight_based: {
            enabled: boolean
            type: 'greater_than' | 'less_than' | 'equal' | 'between'
            value: {
                min?: number
                max?: number
            }
        }
        sku_based: {
            enabled: boolean
            type: 'at_least_one' | 'none' | 'only'
            partial_match: boolean
            value: string
        },
        custom: {
            enabled: boolean,
            script: string
        }
    }
    delivery_days: {
        sunday: IShippingMethodDeliveryDay
        monday: IShippingMethodDeliveryDay
        tuesday: IShippingMethodDeliveryDay
        wednesday: IShippingMethodDeliveryDay
        thursday: IShippingMethodDeliveryDay
        friday: IShippingMethodDeliveryDay
        saturday: IShippingMethodDeliveryDay
    }
    dispatch_days: {
        sunday: IShippingMethodDispatchDay
        monday: IShippingMethodDispatchDay
        tuesday: IShippingMethodDispatchDay
        wednesday: IShippingMethodDispatchDay
        thursday: IShippingMethodDispatchDay
        friday: IShippingMethodDispatchDay
        saturday: IShippingMethodDispatchDay
    }
    bands: IShippingMethodBand[]
    apply_tags: string[]
    apply_attributes: IAttribute[]
    archived: boolean
}

export interface IProductRelationship {
    id: string
}

export interface IDateRange {
    start: Date
    end: Date
}

export interface IBlockedDate {
    _id?: string
    store_id?: string
    resource_id: string
    title: string
    start: Date
    end: Date
}

export interface IConfig {
    timezone: string
    window: number
    max_orders: number
    carrier_test_mode_enabled: boolean
    carrier_test_mode_match: string | null
    order_tagging_enabled: boolean
    order_tagging_date_format: string
}

export interface IWebhookSubscription {
    id: string
    topic: string
}

export interface ICarrierService {
    id: string
    name: string
    active: boolean
    service_discovery: boolean
    carrier_service_type: string
    admin_graphql_api_id: string
    format: string
    callback_url: string
}

export interface IStoreDocument {
    _id: string
    token: string
    webhook_subscriptions: IWebhookSubscription[]
    config: IConfig
    carrier_service?: ICarrierService
}