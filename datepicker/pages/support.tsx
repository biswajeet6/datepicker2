import React from 'react'
import Stage from '@/app/components/common/Stage'
import {Card, TextContainer} from '@shopify/polaris'
import {_T} from '@/app/providers/TextProvider'

const Support: React.FC = (): JSX.Element => {
    return (
        <Stage>
            <Card sectioned title={_T('App.Pages.Support.title')}>
                <TextContainer>
                    <p>{_T('App.Pages.Support.subTitle')}</p>
                </TextContainer>
            </Card>
        </Stage>
    )
}

export default Support