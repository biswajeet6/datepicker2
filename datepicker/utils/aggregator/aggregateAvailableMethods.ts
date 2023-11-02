import {IShippingMethod} from '@/app/types/store'
import {IParams, IQueryLineItem} from '@/app/utils/aggregator/types'
import Logger from '@/app/utils/logger'
import vm from 'vm'

interface IAggregatedCart {
    variants: string[]
    skus: string[]
    weight: number
}

const getCartVariantIds = (items: IQueryLineItem[]): string[] => {
    return items.map(item => item.variantId).filter(id => id)
}

const getCartWeight = (items: IQueryLineItem[]): number => {
    return items.filter(item => (item.grams && item.quantity)).reduce((sum, item) => sum + (item.grams * item.quantity), 0)
}

const getCartSkus = (items: IQueryLineItem[]): string[] => {
    return items.filter(item => item.sku).map(item => item.sku.toLowerCase()).filter(sku => sku)
}

const matchesProductBasedCondition = (cart: IAggregatedCart, method: IShippingMethod): boolean => {

    if (cart.variants.length === 0) return true

    const conditionVariants = method.conditions.product_based.product_ids.map((item) => {
        return item.variants.map((variant) => {
            return variant.id
        })
    }).flat()

    const intersect = cart.variants.filter(p => conditionVariants.includes(p))

    switch (method.conditions.product_based.type) {
        case 'all':
            return (intersect.length === conditionVariants.length)
        case 'at_least_one':
            return (intersect.length > 0)
        case 'none':
            return (intersect.length === 0)
        case 'only':
            return (cart.variants.filter(cartVariantId => !conditionVariants.includes(cartVariantId)).length === 0)
    }

    Logger.error(`Product based condition type "${method.conditions.product_based.type}" does not exist`)

    return false
}

const matchesWeightBasedCondition = (cart: IAggregatedCart, method: IShippingMethod): boolean => {

    if (cart.weight === 0) return true

    switch (method.conditions.weight_based.type) {
        case 'greater_than':
            return cart.weight > method.conditions.weight_based.value.min
        case 'less_than':
            return cart.weight < method.conditions.weight_based.value.max
        case 'equal':
            return cart.weight === method.conditions.weight_based.value.min
        case 'between':
            return (cart.weight > method.conditions.weight_based.value.min && cart.weight < method.conditions.weight_based.value.max)
    }

    Logger.error(`Weight based condition type "${method.conditions.product_based.type}" does not exist`)

    return false
}

const matchesSkuBasedCondition = (cart: IAggregatedCart, method: IShippingMethod): boolean => {

    if (cart.skus.length === 0) return true

    const conditionSkus = method.conditions.sku_based.value.split(',').map(sku => sku.trim().toLowerCase())

    if (conditionSkus.length === 0) return true

    let intersect = []
    if (method.conditions.sku_based.partial_match) {
        intersect = cart.skus.filter((sku) => {
            return conditionSkus.filter((conditionSku) => {
                return sku.includes(conditionSku)
            }).length > 0
        })
    } else {
        intersect = cart.skus.filter(sku => conditionSkus.includes(sku))
    }

    switch (method.conditions.sku_based.type) {
        case 'at_least_one':
            return intersect.length > 0
        case 'none':
            return intersect.length === 0
        case 'only':
            return intersect.length === cart.skus.length
    }

    Logger.error(`SKU based condition type "${method.conditions.product_based.type}" does not exist`)

    return false
}

const aggregateAvailableMethods = (params: IParams, methods: IShippingMethod[]): IShippingMethod[] => {

    // aggregate cart details required to perform conditional checks
    const cart: IAggregatedCart = {
        variants: getCartVariantIds(params.query.lineItems),
        skus: getCartSkus(params.query.lineItems),
        weight: getCartWeight(params.query.lineItems),
    }

    return methods.filter((method) => {

        try {
            if (
                method.conditions.product_based &&
                method.conditions.product_based.enabled
            ) {
                if (!matchesProductBasedCondition(cart, method)) {
                    return false
                }
            }

            if (
                method.conditions.weight_based &&
                method.conditions.weight_based.enabled
            ) {
                if (!matchesWeightBasedCondition(cart, method)) {
                    return false
                }
            }

            if (
                method.conditions.sku_based &&
                method.conditions.sku_based.enabled
            ) {
                if (!matchesSkuBasedCondition(cart, method)) {
                    return false
                }
            }

            /**
             * @todo swap out for https://www.npmjs.com/package/vm2 due to vm security concerns
             */
            if (
                method.conditions.custom &&
                method.conditions.custom.enabled &&
                false
            ) {
                try {
                    const script = new vm.Script(`${method.conditions.custom.script}`)

                    const context = vm.createContext({
                        cart: cart,
                        method: method,
                        result: true
                    })

                    script.runInContext(context, {
                        timeout: 1000,
                    })

                    if (!context.result) {
                        return false
                    }
                } catch (e) {
                    console.error(e)

                    return false
                }
            }
        } catch (exception) {
            Logger.error('failed to apply shipping method conditions', {
                exception: exception
            })

            return false
        }

        // true by default
        return true
    })
}

export default aggregateAvailableMethods