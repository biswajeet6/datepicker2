import getEnv from '@/app/hooks/getEnv'
import React from 'react'
import '@shopify/polaris/dist/styles.css'
import '../styles/globals.css'
import PolarisProvider from '@/app/providers/PolarisProvider'
import RoutePropagator from '@/app/components/common/RoutePropagator'
import {Provider as AppBridgeProvider} from '@shopify/app-bridge-react'
import LoadingBar from '@/app/components/common/LoadingBar'
import {AuthenticatedFetchProvider} from '@/app/providers/AuthenticatedFetchProvider'
import {QueryClient, QueryClientProvider} from 'react-query'
import {ShopProvider} from '@/app/providers/ShopProvider'
import {ConfigProvider} from '@/app/providers/ConfigProvider'

const queryClient = new QueryClient()

const App = ({Component, pageProps}) => {

    const [domain, apiKey] = getEnv()

    if (!domain || !apiKey) {
        return (
            <React.Fragment>
                <LoadingBar/>
            </React.Fragment>
        )
    }

    const appBridgeConfig = {
        apiKey: apiKey,
        shopOrigin: domain,
        forceRedirect: true
    }

    return (
        <AppBridgeProvider config={appBridgeConfig}>
            <RoutePropagator/>
            <PolarisProvider>
                <ShopProvider shop={domain}>
                    <AuthenticatedFetchProvider domain={domain}>
                        <QueryClientProvider client={queryClient}>
                            <ConfigProvider>
                                <Component {...pageProps}/>
                            </ConfigProvider>
                        </QueryClientProvider>
                    </AuthenticatedFetchProvider>
                </ShopProvider>
            </PolarisProvider>
        </AppBridgeProvider>
    )
}

export default App
