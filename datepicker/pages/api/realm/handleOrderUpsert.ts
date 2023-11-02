import methods from '../../../atlas'
import determineRegion from '@/app/utils/aggregator/determineRegion'
import PostcodeParser from '@/app/utils/postcodeParser'
import withApp from '@/app/middleware/withApp'
import {INextApiRequest} from '@/app/types/api'
import {NextApiResponse} from 'next'
import {IOrderDocument, IRegion, IShippingMethod, IStoreDocument} from '@/app/types/store'
import {format, isTomorrow} from 'date-fns'
import {utcToZonedTime} from 'date-fns-tz'
import ShopifyGql from '@/app/utils/shopifyGql'
import ApiResponse from '@/app/utils/apiResponse'
import Logger from '@/app/utils/logger'
import RealmApiError from '@/app/utils/errors/RealmApiError'
import ShopifyApi from '@/app/utils/shopifyApi'
import {app} from '@shopify/app-bridge/actions/Print'

type GetDeliveryType = (order: IOrderDocument) => 'local_pickup' | 'external' | 'carrier'

type ValidateOrder = (order: IOrderDocument) => Promise<{
    valid: boolean
    error: string
}>

type ApplyTags = (store: IStoreDocument, nominatedDate: Date, order: IOrderDocument, shippingMethod: IShippingMethod | null, region: IRegion) => void
type ApplyAttributes = (store: IStoreDocument, order: IOrderDocument, shippingMethod: IShippingMethod | null, region: IRegion) => void

const getDeliveryType: GetDeliveryType = (order) => {
    if (order.local_pickup) return 'local_pickup'
    if (order.externally_shipped) return 'external'
    return 'carrier'
}

const getNominatedDate = async (order): Promise<Date | null> => {

    const nominated_date_attribute = order.note_attributes.find(note_attribute => note_attribute.name === '_nominated_date')
    const lineItemDate = order.line_items.find((item) => item?.line_date?.length > 0)

    if (!nominated_date_attribute && !lineItemDate) {
        return null
    }

    const nominatedDateString = nominated_date_attribute.value;
    const lineItemDateString = lineItemDate?.line_date;

    try {
        const orderDate = new Date(Date.parse(nominatedDateString))
        if (!lineItemDateString) {
            return orderDate;
        } else {
            // if we have a line date check to see if it bigger
            const lineDate = new Date(Date.parse(lineItemDateString))
            return lineDate > orderDate ? lineDate : orderDate;
        }
    } catch (e) {
        await methods.order.update(order._id, {
            internal_status: 'errored',
            internal_message: `Failed to parse date ${nominatedDateString}`
        })
        throw new RealmApiError(`Failed to parse date ${nominatedDateString}`, 422)
        return null;
    }
}

const validateOrder: ValidateOrder = async (order) => {

    const result = {
        valid: true,
        error: null
    }

    // check we have shipping lines
    if (order.shipping_lines.length === 0) {
        result.valid = false
        result.error = 'No shipping lines associated with order'
        return result
    }
    
    // aggregate nominated date
    const getDate = await getNominatedDate(order);
    if (!getDate) {
        result.valid = false
        result.error = 'No nominated date attribute associated with the order'
        return result
    }

    return result
}

const applyAttributes: ApplyAttributes = async (store, order, shippingMethod, region) => {

    if (!store.config.order_tagging_enabled) return

    // set existing note attributes
    const attributes = [...order.note_attributes]

    // initialise applicable attributes
    const applicableAttributes = [].concat(shippingMethod ? shippingMethod.apply_attributes ?? [] : []).concat(region.apply_attributes ?? [])

    // add applicable attributes to existing attributes
    applicableAttributes.forEach((applicableAttribute) => {

        const existingIndex = attributes.findIndex(existingAttribute => existingAttribute.name === applicableAttribute.name)

        if (existingIndex > -1) {
            attributes[existingIndex] = applicableAttribute
        } else {
            attributes.push(applicableAttribute)
        }
    })

    /**
     * Check if the candidate attributes for an update match the existing attribute record hold
     * Omit the values, as we want them to be able to modify values in the Shopify admin if they wish.
     */
    if (
        JSON.stringify(attributes.map(a => a.name)) !==
        JSON.stringify(order.note_attributes.map(a => a.name))
    ) {
        const response = await ShopifyApi(store._id, store.token).updateOrderNoteAttributes(order.order_id, attributes)

        if (response.errors) {
            Logger.error('Failed to apply details', response.errors)

            throw new Error('Failed to apply details')
        }
    }
}

const applyTags: ApplyTags = async (
    store,
    nominatedDate,
    order,
    shippingMethod,
    region
) => {

    if (!store.config.order_tagging_enabled) return

    Logger.info('Running applyTags', {
        orderId: order._id
    })

    // concat all tags to apply
    let tags = []

    // date
    const formattedDate = format(utcToZonedTime(nominatedDate, store.config.timezone), store.config.order_tagging_date_format)
    tags.push(formattedDate)

    // nextDay tag
    if (isTomorrow(utcToZonedTime(nominatedDate, store.config.timezone))) {
        tags.push('Next Day')
    }

    // regional tags
    tags = tags.concat(region.apply_tags ?? [])

    // shipping method tags
    if (shippingMethod) {
        tags = tags.concat(shippingMethod.apply_tags ?? [])
    }

    // determine which tags to add from tag history
    let previousTags = []
    if (order.tag_history && order.tag_history.length > 0) {
        previousTags = order.tag_history.sort((a, b) => b.timestamp - a.timestamp)[0].tags.map(pT => pT)
    }

    // determine which tags to add / remove
    const addTags = tags.filter(tag => !previousTags.includes(tag))
    const removeTags = previousTags.filter(tag => !tags.map(t => t).includes(tag))

    Logger.info('Aggregated tags', {
        orderId: order._id,
        addTags: addTags,
        removeTags: removeTags,
    })

    // attempt to update tags
    if (addTags.length > 0 || removeTags.length > 0) {
        Logger.info('Calling ShopifyGQL', {
            orderId: order._id
        })
        const applyResult = await ShopifyGql(store._id, store.token).updateTags(`gid://shopify/Order/${order.order_id}`, addTags, removeTags)
        Logger.info('Called ShopifyGQL, adding tag history', {
            orderId: order._id,
            applyResult: applyResult,
            history: tags,
        })
        await methods.order.addTagHistory(order._id, (new Date()).getTime(), tags)
    }
}

const handle = async (req: INextApiRequest, res: NextApiResponse) => {

    const {document_id} = req.body

    if (!document_id) {
        throw new RealmApiError('Invalid request', 422)
    }

    Logger.info(`Processing order ${document_id['$oid']}`)

    const order = await methods.order.getById(document_id['$oid'])
    if (!order) {
        throw new RealmApiError('Order not found', 404)
    }

    // validate order fields
    let validationResult
    try {
        validationResult = await validateOrder(order)
    } catch (e) {
        await methods.order.update(order._id, {
            internal_status: 'errored',
            internal_message: 'Error validating order'
        })
        throw new RealmApiError('Error validating order', 422)
    }

    if (!validationResult.valid) {
        await methods.order.update(order._id, {
            internal_status: 'errored',
            internal_message: validationResult.error
        })
        throw new RealmApiError(validationResult.error, 422)
    }

    // aggregate region & postcode
    let postcode
    let region
    switch (getDeliveryType(order)) {
        case 'local_pickup':
            postcode = null
            region = await methods.region.getStoreDefault(order.store_id)
            break;
        case 'external':
        case 'carrier':
            postcode = PostcodeParser.parse(order.postcode)
            region = await determineRegion({
                query: {
                    postcode: postcode,
                    storeId: order.store_id
                }
            })
            break;
        default:
            throw new RealmApiError('Invalid delivery type', 422)
    }

    // ensure we have associated the delivery with a region
    if (!region) {
        await methods.order.update(order._id, {
            internal_status: 'errored',
            internal_message: 'Failed to attribute region'
        })
        throw new RealmApiError('Failed to aggregate region for postcode', 422)
    }

    // associate a shipping method with the order
    let shippingMethod
    if (!order.local_pickup && !order.externally_shipped) {
        shippingMethod = await methods.shippingMethod.getByStoreId(order.store_id).then((methods) => {
            return methods.find((method) => {
                return order.shipping_lines.map((line) => {
                    return line.code
                }).includes(method.service_code)
            })
        })

        if (!shippingMethod) {
            await methods.order.update(order._id, {
                internal_status: 'errored',
                internal_message: 'Unable to associate shipping method'
            })
            throw new RealmApiError('Unable to associate shipping method', 422)
        }
    } else if (order.externally_shipped) {
        if (
            order.shipping_lines.some(s => s.title === 'Standard' || s.source === 'Subscription')
            && order.note_attributes.some(n => n.name === '_orig_ship_code')
          ) {
            var originalShopifyMethodCode = order.note_attributes.find(n => n.name === '_orig_ship_code').value
            shippingMethod = await methods.shippingMethod.getByStoreId(order.store_id).then((methods) => {
                // we have a code, from attribute
                order.externally_shipped = false;
                return methods.find((method) => method.service_code === originalShopifyMethodCode)
            })
        }
    }

    // associate a parsed nominated date with the order
    const nominatedDate = await getNominatedDate(order)
    if (!nominatedDate) {
        await methods.order.update(order._id, {
            internal_status: 'errored',
            internal_message: `Invalid or no date found`
        })
        throw new RealmApiError(`Invalid or no date found`, 422)
    }
    Logger.info('Found date', {
        date: nominatedDate
    })
    const getMethodCode = () => {
        if (order.externally_shipped) return 'external'
        if (order.local_pickup) return 'local'
        if (shippingMethod) return shippingMethod.service_code
        return null
    }

    const store = await methods.store.getById(order.store_id)

    try {
        await applyTags(store, nominatedDate, order, shippingMethod, region)
    } catch (e) {
        Logger.error(e)
        await methods.order.update(order._id, {
            internal_status: 'errored',
            internal_message: `Failed to apply tags`
        })
        throw new RealmApiError('Failed to apply tags', 500, true)
    }

    try {
        await applyAttributes(store, order, shippingMethod, region)
    } catch (e) {
        Logger.error(e)
        await methods.order.update(order._id, {
            internal_status: 'errored',
            internal_message: `Failed to apply details`
        })
        throw new RealmApiError('Failed to apply details', 500, true)
    }

    // successfully processed upsert request - update order & respond
    await methods.order.update(order._id, {
        internal_status: 'processed',
        internal_message: null,
        region_id: region._id,
        shipping_method: getMethodCode(),
        nominated_date: nominatedDate
    })

    return await ApiResponse(res).send({
        message: 'Success'
    })
}

export default withApp(handle, {
    guards: ['realm']
})