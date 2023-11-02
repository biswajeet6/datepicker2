import React, {useEffect, useState} from 'react'
import {useRouter} from 'next/router'
import {Tabs} from '@shopify/polaris'

const Navigation: React.FC = (): JSX.Element => {

    const router = useRouter()

    const [active, setActive] = useState(0)

    const tabs = [
        {
            id: 'dashboard',
            content: 'Dashboard',
            accessibilityLabel: 'dashboard',
            url: '/dashboard',
            enabled: true,
        },
        {
            id: 'configuration',
            content: 'Configuration',
            accessibilityLabel: 'configuration',
            url: '/configuration',
            enabled: true,
        },
        {
            id: 'rules',
            content: 'Rules',
            accessibilityLabel: 'rules',
            url: '/rules',
            enabled: true,
        },
        {
            id: 'regions',
            content: 'Regions',
            accessibilityLabel: 'regions',
            url: '/regions',
            enabled: true,
        },
        {
            id: 'shippingMethods',
            content: 'Shipping Methods',
            accessibilityLabel: 'shipping methods',
            url: '/shippingMethods',
            enabled: true,
        },
        {
            id: 'setup',
            content: 'Setup',
            accessibilityLabel: 'setup',
            url: '/setup',
            enabled: false,
        },
    ]

    useEffect(() => {
        const path = router.asPath.split('?')[0]

        const activeIndex = tabs.filter(tab => tab.enabled).map(t => t.url).indexOf(path)

        setActive(activeIndex)
    }, [router.asPath])

    return (
        <React.Fragment>
            <Tabs selected={active} tabs={tabs.filter(tab => tab.enabled)}/>
        </React.Fragment>
    )
}

export default Navigation