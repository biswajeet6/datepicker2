import React from 'react'
import {IBlockedDate} from '@/app/types/store'
import {Icon, ResourceItem, Stack, TextStyle} from '@shopify/polaris'
import {CircleDisabledMajor} from '@shopify/polaris-icons'

const BlockedDateResourceItem: React.FC<{
    blockedDate: IBlockedDate
    onDeleteCallback(id: string): void,
    onSelectCallback(id: string): void
}> = ({blockedDate, onDeleteCallback, onSelectCallback}): JSX.Element => {
    return (
        <React.Fragment>
            <ResourceItem
                id={blockedDate._id}
                onClick={() => onSelectCallback(blockedDate._id)}
                persistActions={true}
                verticalAlignment={'center'}
                media={<Icon source={CircleDisabledMajor} color="base"/>}
                shortcutActions={[
                    {
                        content: 'Edit',
                        onAction() {
                            onSelectCallback(blockedDate._id)
                        }
                    },
                    {
                        // @ts-ignore
                        destructive: true,
                        content: 'Remove',
                        onAction() {
                            onDeleteCallback(blockedDate._id)
                        }
                    }
                ]}
            >
                <Stack vertical={true} spacing={'extraTight'}>
                    <Stack.Item>
                        <TextStyle variation={'strong'}>{blockedDate.title}</TextStyle>
                    </Stack.Item>
                    <Stack.Item>
                        <TextStyle
                            variation={'subdued'}>{blockedDate.start.toDateString()} - {blockedDate.end.toDateString()}</TextStyle>
                    </Stack.Item>
                </Stack>
            </ResourceItem>
        </React.Fragment>
    )
}

export default BlockedDateResourceItem