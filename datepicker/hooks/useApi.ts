import useAuthenticatedFetch from '@/app/providers/AuthenticatedFetchProvider'
import API_ROUTES from '@/app/consts/api'
import {
    IBlockedDate,
    ICarrierService,
    IConfig,
    IRegion,
    IRule,
    IShippingMethod,
    IStoreDocument,
    IWebhookSubscription
} from '@/app/types/store'
import {utcToZonedTime, zonedTimeToUtc} from 'date-fns-tz'
import {APP_TIMEZONE} from '@/app/consts/app'
import {ISyncWebhookResult} from '../pages/api/syncWebhooks'

export interface IApiError {
    status: number
    message: string
    errors: { field: string, message: string }[]
}

class ApiError implements IApiError {
    status: number;
    message: string;
    errors: { field: string, message: string }[];

    constructor(status, message, errors = []) {
        this.status = status
        this.message = message
        this.errors = errors
    }
}

/**
 * @todo this probably shouldn't really be a hook...
 */
const useApi = () => {

    const {authenticatedFetch} = useAuthenticatedFetch()

    const requestSuccess = (status) => {
        return status === 200
    }

    const testPostcode = async (postcode: string): Promise<any> => {
        const result = await authenticatedFetch(API_ROUTES.TEST_POSTCODE, {
            postcode: postcode
        })

        if (requestSuccess(result.status)) {
            return result.data
        }

        throw new ApiError(result.status, result.data.message)
    }

    const store = {

        /**
         *
         */
        getById: async (): Promise<IStoreDocument> => {
            const result = await authenticatedFetch(API_ROUTES.STORE.GET_BY_ID)

            if (result.status === 200) return result.data

            throw new ApiError(result.status, result.data.message)
        },

        getConfig: async (): Promise<IConfig> => {
            const result = await authenticatedFetch(API_ROUTES.STORE.GET_CONFIG)

            if (result.status === 200) return result.data

            throw new ApiError(result.status, result.data.message)
        },

        /**
         *
         * @param config
         */
        updateConfig: async (config: IConfig): Promise<any> => {

            config.window = parseInt(config.window.toString())
            config.max_orders = parseInt(config.max_orders.toString())

            const result = await authenticatedFetch(API_ROUTES.STORE.UPDATE_CONFIG, {
                config: config
            })

            if (result.status === 200) return result.data

            throw new ApiError(result.status, result.data.message)
        },

        /**
         *
         */
        syncWebhookSubscriptions: async (forceReset: boolean): Promise<ISyncWebhookResult[]> => {
            const result = await authenticatedFetch(API_ROUTES.STORE.SYNC_WEBHOOK_SUBSCRIPTIONS, {
                forceReset: forceReset
            })

            if (result.status === 200) return result.data

            throw new ApiError(result.status, result.data.message)
        },

        /**
         *
         */
        getWebhookSubscriptions: async (): Promise<IWebhookSubscription[]> => {
            const result = await authenticatedFetch(API_ROUTES.STORE.GET_WEBHOOK_SUBSCRIPTIONS)

            if (result.status === 200) return result.data

            throw new ApiError(result.status, result.data.message)
        },

        /**
         *
         */
        getCarrierService: async (): Promise<ICarrierService> => {
            const result = await authenticatedFetch(API_ROUTES.STORE.GET_CARRIER_SERVICE)

            if (result.status === 200) return result.data

            throw new ApiError(result.status, result.data.message)
        },

        /**
         *
         */
        createCarrierService: async (): Promise<boolean> => {
            const result = await authenticatedFetch(API_ROUTES.STORE.CREATE_CARRIER_SERVICE)

            if (result.status === 200) return result.data

            throw new ApiError(result.status, result.data.message)
        },

        /**
         *
         */
        deleteCarrierService: async (): Promise<boolean> => {
            const result = await authenticatedFetch(API_ROUTES.STORE.DELETE_CARRIER_SERVICE)

            if (result.status === 200) return result.data

            throw new ApiError(result.status, result.data.message)
        }
    }

    const blockedDate = {

        /**
         *
         */
        getById: async (id: string): Promise<IBlockedDate> => {

            const result = await authenticatedFetch(API_ROUTES.BLOCKED_DATE.GET_BY_ID, {
                id: id
            })

            if (requestSuccess(result.status)) {

                result.data.start = utcToZonedTime(result.data.start, APP_TIMEZONE)
                result.data.end = utcToZonedTime(result.data.end, APP_TIMEZONE)

                return result.data
            }

            throw new ApiError(result.status, result.data.message)
        },

        /**
         *
         */
        getByResourceId: async (request: {
            resourceId: string,
        }): Promise<{
            data: IBlockedDate[]
        }> => {
            const result = await authenticatedFetch(API_ROUTES.BLOCKED_DATE.GET_BY_RESOURCE, request)

            if (requestSuccess(result.status)) {

                // transform dates
                result.data.data = result.data.data.map((blockedDate: IBlockedDate) => {
                    blockedDate.start = utcToZonedTime(blockedDate.start, APP_TIMEZONE)
                    blockedDate.end = utcToZonedTime(blockedDate.end, APP_TIMEZONE)
                    return blockedDate
                })

                return result.data
            }

            throw new ApiError(result.status, result.data.message)
        },

        /**
         *
         * @param blockedDate
         */
        insert: async (blockedDate: IBlockedDate): Promise<any> => {

            blockedDate.start = zonedTimeToUtc(blockedDate.start, APP_TIMEZONE)
            blockedDate.end = zonedTimeToUtc(blockedDate.end, APP_TIMEZONE)

            const result = await authenticatedFetch(API_ROUTES.BLOCKED_DATE.INSERT, {
                blockedDate: blockedDate
            })

            if (result.status === 200) return result.data

            throw new ApiError(result.status, result.data.message)
        },

        update: async (blockedDate: IBlockedDate): Promise<any> => {

            blockedDate.start = zonedTimeToUtc(blockedDate.start, APP_TIMEZONE)
            blockedDate.end = zonedTimeToUtc(blockedDate.end, APP_TIMEZONE)

            const result = await authenticatedFetch(API_ROUTES.BLOCKED_DATE.UPDATE, {
                blockedDate: blockedDate
            })

            if (result.status === 200) return result.data

            throw new ApiError(result.status, result.data.message)
        },

        /**
         *
         * @param id
         */
        delete: async (id: string): Promise<any> => {
            const result = await authenticatedFetch(API_ROUTES.BLOCKED_DATE.DELETE, {
                id: id
            })

            if (result.status === 200) return result.data

            throw new ApiError(result.status, result.data.message)
        }
    }

    const rule = {

        /**
         *
         */
        getById: async (id: string): Promise<IRule> => {
            const result = await authenticatedFetch(API_ROUTES.RULES.GET_BY_ID, {
                id: id
            })

            if (requestSuccess(result.status)) {

                result.data.active_from.start = utcToZonedTime(result.data.active_from.start, APP_TIMEZONE)

                if (result.data.active_from.end) {
                    result.data.active_from.end = utcToZonedTime(result.data.active_from.end, APP_TIMEZONE)
                }

                return result.data
            }

            throw new ApiError(result.status, result.data.message)
        },

        /**
         *
         */
        getByStoreId: async (): Promise<{
            data: IRule[],
            hasNext: boolean,
            length: 0,
            limit: 20,
            maxPage: 0,
            page: 1
        }> => {
            const result = await authenticatedFetch(API_ROUTES.RULES.GET_BY_STORE_ID)

            if (requestSuccess(result.status)) {

                result.data.data = result.data.data.map((rule: IRule) => {
                    rule.active_from.start = utcToZonedTime(rule.active_from.start, APP_TIMEZONE)

                    if (rule.active_from.end) {
                        rule.active_from.end = utcToZonedTime(rule.active_from.end, APP_TIMEZONE)
                    }

                    return rule
                })

                return result.data
            }

            throw new ApiError(result.status, result.data.message)
        },

        /**
         *
         * @param rule
         */
        insert: async (rule: IRule): Promise<any> => {

            rule.active_from.start = zonedTimeToUtc(rule.active_from.start, APP_TIMEZONE)

            if (rule.active_from.end) {
                rule.active_from.end = zonedTimeToUtc(rule.active_from.end, APP_TIMEZONE)
            } else {
                rule.active_from.end = null
            }

            const result = await authenticatedFetch(API_ROUTES.RULES.CREATE, {
                rule: rule
            })

            if (result.status === 200) return result.data

            throw new ApiError(result.status, result.data.message)
        },

        update: async (rule: IRule): Promise<any> => {

            rule.active_from.start = zonedTimeToUtc(rule.active_from.start, APP_TIMEZONE)

            if (rule.active_from.end) {
                rule.active_from.end = zonedTimeToUtc(rule.active_from.end, APP_TIMEZONE)
            } else {
                rule.active_from.end = null
            }

            const result = await authenticatedFetch(API_ROUTES.RULES.UPDATE, {
                rule: rule
            })

            if (result.status === 200) return result.data

            throw new ApiError(result.status, result.data.message)
        },

        /**
         *
         * @param id
         */
        delete: async (id: string): Promise<any> => {
            const result = await authenticatedFetch(API_ROUTES.RULES.DELETE, {
                id: id
            })

            if (result.status === 200) return result.data

            throw new ApiError(result.status, result.data.message)
        }
    }

    const region = {

        /**
         *
         */
        getById: async (id: string): Promise<IRegion> => {
            const result = await authenticatedFetch(API_ROUTES.REGIONS.GET_BY_ID, {
                id: id
            })

            if (result.status === 200) return result.data

            throw new ApiError(result.status, result.data.message)
        },

        /**
         *
         */
        getByStoreId: async (): Promise<IRegion[]> => {
            const result = await authenticatedFetch(API_ROUTES.REGIONS.GET_BY_STORE_ID)

            if (result.status === 200) return result.data

            throw new ApiError(result.status, result.data.message)
        },

        insert: async (request: {
            name: string
        }): Promise<any> => {
            const result = await authenticatedFetch(API_ROUTES.REGIONS.CREATE, request)

            if (result.status === 200) return result.data

            throw new ApiError(result.status, result.data.message)
        },

        update: async (request: {
            regionId: string,
            fields: any
        }): Promise<any> => {
            const result = await authenticatedFetch(API_ROUTES.REGIONS.UPDATE, request)

            if (result.status === 200) return result.data

            throw new ApiError(result.status, result.data.message, result.data.errors ?? [])
        },

        /**
         *
         * @param id
         */
        delete: async (id: string): Promise<any> => {
            const result = await authenticatedFetch(API_ROUTES.REGIONS.DELETE, {
                id: id
            })

            if (result.status === 200) return result.data

            throw new ApiError(result.status, result.data.message)
        },

    }

    const shippingMethod = {

        /**
         *
         */
        getById: async (id: string): Promise<IShippingMethod> => {
            const result = await authenticatedFetch(API_ROUTES.SHIPPING_METHODS.GET_BY_ID, {
                id: id
            })

            if (result.status === 200) return result.data

            throw new ApiError(result.status, result.data.message)
        },

        /**
         *
         */
        getByStoreId: async (): Promise<IShippingMethod[]> => {
            const result = await authenticatedFetch(API_ROUTES.SHIPPING_METHODS.GET_BY_STORE_ID)

            if (result.status === 200) return result.data

            throw new ApiError(result.status, result.data.message)
        },

        insert: async (request: {
            name: string
        }): Promise<any> => {
            const result = await authenticatedFetch(API_ROUTES.SHIPPING_METHODS.CREATE, request)

            if (result.status === 200) return result.data

            throw new ApiError(result.status, result.data.message)
        },

        update: async (shippingMethod: IShippingMethod): Promise<any> => {
            const result = await authenticatedFetch(API_ROUTES.SHIPPING_METHODS.UPDATE, {
                shippingMethod: shippingMethod
            })

            if (result.status === 200) return result.data

            throw new ApiError(result.status, result.data.message, result.data.errors ?? [])
        },

        /**
         *
         * @param id
         */
        delete: async (id: string): Promise<any> => {
            const result = await authenticatedFetch(API_ROUTES.SHIPPING_METHODS.DELETE, {
                id: id
            })

            if (result.status === 200) return result.data

            throw new ApiError(result.status, result.data.message)
        },

    }

    return {
        testPostcode,
        store,
        blockedDate,
        shippingMethod,
        rule,
        region
    }
}

export default useApi