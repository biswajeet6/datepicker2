import React, {createContext, useContext} from 'react'
import {useAppBridge} from '@shopify/app-bridge-react'
import {authenticatedFetch as shopifyAuthenticatedFetch} from '@shopify/app-bridge-utils'

export interface IFFetchContext {
    domain: string,
    children: any,
}

interface IContextValue {
    authenticatedFetch(route: string, body?: Record<string, unknown>): Promise<{
        status: number,
        data: any
    }>
}

export const FetchContext: React.Context<IContextValue> = createContext(null)

/**
 * Authenticated fetch provider
 *
 * @param children
 * @param shop
 * @constructor
 */
export const AuthenticatedFetchProvider: React.FC<IFFetchContext> = ({children, domain}) => {

    const appBridge = useAppBridge()

    const fetch = shopifyAuthenticatedFetch(appBridge)

    const authenticatedFetch = async (route: string, body: Record<string, unknown> = {}) => {

        const result = await fetch(route, {
            method: 'POST',
            body: JSON.stringify(Object.assign({}, body, {storeId: domain}))
        })

        return {
            status: result.status,
            data: await result.json()
        }
    }

    return (
        <FetchContext.Provider value={{authenticatedFetch}}>
            {children}
        </FetchContext.Provider>
    )
}

const useAuthenticatedFetch = () => useContext(FetchContext)

export default useAuthenticatedFetch