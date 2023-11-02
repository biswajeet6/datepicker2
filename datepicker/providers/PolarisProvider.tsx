import React from 'react'

import {AppProvider} from '@shopify/polaris'
import {getTranslations} from './TextProvider'
import CustomLink from '@/app/components/common/CustomLink'

const PolarisProvider = ({children}) => {
    return (
        <AppProvider
            i18n={getTranslations()}
            linkComponent={CustomLink}>
            {children}
        </AppProvider>
    )
}

export default PolarisProvider