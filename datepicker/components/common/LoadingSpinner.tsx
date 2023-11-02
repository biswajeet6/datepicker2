import {Spinner} from '@shopify/polaris'
import React from 'react'

interface IProps {
    size?: 'small' | 'large'
    align?: 'center' | 'left' | 'right'
}

const LoadingSpinner: React.FC<IProps> = (
    {
        size = 'large',
        align = 'center'
    }): JSX.Element => {
    return (
        <React.Fragment>
            <div style={{textAlign: align}}>
                <Spinner accessibilityLabel="Loading..." size={size}/>
            </div>
        </React.Fragment>
    )
}

export default LoadingSpinner