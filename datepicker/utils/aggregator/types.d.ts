import {IParsedPostcode} from '../postcodeParser'
import {IShippingMethod} from '@/app/types/store'

export interface IShippingRate {
    service_name: string
    service_code: string
    total_price: number
    description: string
    currency: string
    phone_required: boolean
    min_delivery_date?: string
    max_delivery_date?: string
}

export interface IShippingRateRequestBodyOrigin {
    country: string
    postal_code: string
    province: string
    city: string
    name: string
    address1: string
    address2: string
    address3: string
    phone: string
    fax: string
    email: string
    address_type: string
    company_name: string
}

export interface IShippingRateRequestBodyDestination {
    country: string
    postal_code: string
    province: string
    city: string
    name: string
    address1: string
    address2: string
    address3: string
    phone: string
    fax: string
    email: string
    address_type: string
    company_name: string
}

export interface IShippingRateRequestBodyItem {
    name: string
    sku: string
    quantity: number
    grams: number
    price: number
    vendor: string
    requires_shipping: boolean
    taxable: boolean
    fulfillment_service: string
    properties: {} // @todo
    product_id: number
    variant_id: number
}


export interface IShippingRateRequestBody {
    rate: {
        origin: IShippingRateRequestBodyOrigin
        destination: IShippingRateRequestBodyDestination
        items: IShippingRateRequestBodyItem[]
        currency: string
        locale: string
    }
}

export interface IShippingQuery {
    storeId: string
    rate: IShippingRateRequestBody
}

export interface IShippingParams {
    query: IShippingQuery
}

export interface IQueryLineItem {
    productId: string
    variantId: string
    sku: string
    grams: number
    quantity: number
}

export interface IQuery {
    postcode: IParsedPostcode
    storeId: string
    lineItems?: IQueryLineItem[]
}

export interface IParams {
    query: IQuery
}

export interface IAggregatedAvailableShippingMethod {
    id: string
    method: IShippingMethod
    earliest_date: Date
}

export interface IAggregatedBlockedDate {
    date: Date
}

export interface IResult {
    dates: {
        date: Date
        available: boolean
        source: string | null
        blockedIds: string[]
    }[]
    available_shipping_methods: IAggregatedAvailableShippingMethod[]
}