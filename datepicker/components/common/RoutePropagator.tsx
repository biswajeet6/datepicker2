import React, {useEffect} from 'react'
import {Context as AppBridgeContext, RoutePropagator as ShopifyRoutePropagator} from '@shopify/app-bridge-react'
import {Redirect} from '@shopify/app-bridge/actions';
import Router, {useRouter} from 'next/router';

const RoutePropagator = () => {
    const router = useRouter()
    const {asPath} = router
    const appBridge = React.useContext(AppBridgeContext)

    useEffect(() => {
        appBridge.subscribe(Redirect.ActionType.APP, ({path}) => {
            Router.push(path)
        })
    }, [])

    return appBridge && asPath ? (
        <ShopifyRoutePropagator location={asPath}/>
    ) : null
}

export default RoutePropagator