import {ObjectID} from 'mongodb';
import {connectToDatabase} from '@/app/utils/mongo'
import {IOrderDocument, IRule, IShippingMethod} from '@/app/types/store'

const COLLECTION = 'orders'

const orderMethods = {
    getById: async (id: string): Promise<IOrderDocument | null> => {
        const mongo = await connectToDatabase()

        return await mongo.client.db().collection(COLLECTION).findOne({_id: ObjectID(id)}) ?? null
    },
    update: async (id: string, update: any): Promise<boolean> => {
        const mongo = await connectToDatabase()

        if (update.region_id) update.region_id = ObjectID(update.region_id)

        return await mongo.client.db().collection(COLLECTION).updateOne({
            _id: ObjectID(id)
        }, {
            $set: update
        })
    },
    addTagHistory: async (id: string, timestamp: number, tags: string[]): Promise<boolean> => {
        const mongo = await connectToDatabase()

        return await mongo.client.db().collection(COLLECTION).updateOne({
            _id: ObjectID(id)
        }, {
            $addToSet: {
                tag_history: {
                    timestamp: timestamp,
                    tags: tags,
                }
            }
        })
    },
    replaceServiceCodes: async (storeId: string, existingMethod: IShippingMethod, newMethod: IShippingMethod): Promise<boolean> => {
        const mongo = await connectToDatabase()

        return await mongo.client.db().collection(COLLECTION).update(
            {store_id: storeId},
            {
                $set: {
                    "shipping_lines.$[elem].code": newMethod.service_code,
                    "shipping_lines.$[elem].title": newMethod.name,
                }
            },
            {
                multi: true,
                arrayFilters: [
                    {
                        "elem.code": existingMethod.service_code
                    }
                ]
            }
        )
    },
    exceedingDailyLimit: async (storeId: string, limit: number, today: Date): Promise<{
        _id: { date: Date },
        count: number
    }[]> => {
        const mongo = await connectToDatabase()

        return await mongo.client.db().collection(COLLECTION).aggregate([
            {
                $match: {
                    store_id: {$eq: storeId},
                    internal_status: 'processed',
                    externally_shipped: false,
                    nominated_date: {$gte: today},
                }
            },
            {
                $group: {
                    _id: {
                        date: "$nominated_date"
                    },
                    count: {$sum: 1}
                }
            },
            {
                $match: {
                    count: {$gte: limit}
                }
            }
        ]).toArray()
    },

    exceedingProductUnitLimits: async (storeId: string, today: Date, productIds: string[], ruleIds: ObjectID[]): Promise<{
        _id: {
            nominated_date: Date,
            product_id: string,
        },
        quantity: number,
        rules: IRule[],
    }[]> => {
        const mongo = await connectToDatabase()

        return mongo.client.db().collection(COLLECTION).aggregate([
            {
                '$match': {
                    store_id: {$eq: storeId},
                    internal_status: 'processed',
                    externally_shipped: false,
                    nominated_date: {$gte: today},
                    ['line_items.id']: {
                        $in: productIds
                    }
                }
            }, {
                '$unwind': {
                    'path': '$line_items'
                }
            }, {
                '$group': {
                    '_id': {
                        'nominated_date': '$nominated_date',
                        'product_id': '$line_items.id'
                    },
                    'quantity': {
                        '$sum': '$line_items.quantity'
                    }
                }
            }, {
                '$lookup': {
                    'from': 'rules',
                    'let': {
                        'product_id': {
                            '$concat': [
                                'gid://shopify/Product/', '$_id.product_id'
                            ]
                        },
                        'quantity': '$quantity'
                    },
                    'pipeline': [
                        {
                            '$match': {
                                '$expr': {
                                    '$and': [
                                        {
                                            '$eq': [
                                                '$enabled', true
                                            ]
                                        }, {
                                            '$eq': [
                                                '$archived', false
                                            ]
                                        }, {
                                            '$gte': [
                                                '$$quantity', '$production_limits.max_units_per_day'
                                            ]
                                        }, {
                                            '$in': [
                                                '$$product_id', '$production_limits.product_ids'
                                            ]
                                        }, {
                                            '$in': [
                                                '$_id', ruleIds
                                            ]
                                        }
                                    ]
                                }
                            }
                        }
                    ],
                    'as': 'rules'
                }
            }, {
                '$match': {
                    '$expr': {
                        '$gt': [
                            {
                                '$size': '$rules'
                            }, 0
                        ]
                    }
                }
            }
        ]).toArray()
    },

    exceedingShippingMethodLimit: async (storeId: string, today: Date, shippingMethodServiceCodes: string[]): Promise<{
        _id: {
            date: Date,
            shipping_method: string,
        },
        count: number,
        method: IShippingMethod | null
    }[]> => {
        const mongo = await connectToDatabase()

        return mongo.client.db().collection(COLLECTION).aggregate([
            {
                $match: {
                    store_id: {$eq: storeId},
                    shipping_method: {$in: shippingMethodServiceCodes},
                    internal_status: 'processed',
                    externally_shipped: false,
                    nominated_date: {$gte: today},
                }
            },
            {
                $group: {
                    _id: {
                        date: "$nominated_date",
                        shipping_method_service_code: "$shipping_method"
                    },
                    count: {$sum: 1}
                }
            },
            {
                $lookup: {
                    from: 'shipping_methods',
                    localField: '_id.shipping_method_service_code',
                    foreignField: 'service_code',
                    as: 'method'
                }
            },
            {
                $unwind: {
                    path: '$method'
                }
            },
            {
                $match: {
                    $expr: {
                        $and: [
                            {$gt: ["$method.daily_order_limit", 0]},
                            {$gte: ["$count", "$method.daily_order_limit"]}
                        ]
                    }
                }
            }
        ]).toArray()
    },

    exceedingShippingMethodLimitForDay: async (storeId: string, methodIds: string[], date: Date): Promise<{
        _id: {
            shipping_method: string
        }
        total_orders: number
        method: IShippingMethod
    }[]> => {
        const mongo = await connectToDatabase()

        return await mongo.client.db().collection(COLLECTION).aggregate([
            {
                '$match': {
                    'store_id': storeId,
                    'internal_status': 'processed',
                    'shipping_method': {
                        '$in': methodIds
                    },
                    'nominated_date': date,
                    'externally_shipped': false,
                }
            }, {
                '$group': {
                    '_id': {
                        'shipping_method': '$shipping_method'
                    },
                    'total_orders': {
                        '$sum': 1
                    }
                }
            }, {
                '$lookup': {
                    'from': 'shipping_methods',
                    'localField': '_id.shipping_method',
                    'foreignField': 'service_code',
                    'as': 'method'
                }
            }, {
                '$unwind': {
                    'path': '$method'
                }
            }, {
                '$match': {
                    '$expr': {
                        '$gte': [
                            '$total_orders', '$method.daily_order_limit'
                        ]
                    }
                }
            }
        ]).toArray()
    }
}

export default orderMethods