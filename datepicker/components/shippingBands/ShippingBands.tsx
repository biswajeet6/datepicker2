import {Button, ButtonGroup, Card, EmptyState, ResourceItem, ResourceList, Stack, TextStyle} from '@shopify/polaris'
import {_T} from '@/app/providers/TextProvider'
import React, {useCallback} from 'react'
import {IShippingMethodBand} from '@/app/types/store'
import createDefaultShippingBand from '../../helpers/createDefaultShippingBand'
import EditBand from '@/app/components/shippingBands/EditBand'
import {CircleDownMajor, CircleUpMajor, DeleteMajor, EditMajor} from '@shopify/polaris-icons';

const ShippingBands: React.FC<{
    bands: IShippingMethodBand[]
    updateCallback(value: IShippingMethodBand[])
}> = ({bands, updateCallback}): JSX.Element => {

    /**
     * @todo this is a bit naughty
     */
    const toggleEdit = useCallback((index) => {
        // @ts-ignore
        bands[index].edit = !bands[index].edit
        updateCallback(bands)
    }, [bands])

    const deleteBand = useCallback((index) => {

        // shift priority of other bands
        const _bands = bands.sort((a, b) => a.priority - b.priority)
        if (_bands.length > 1) {
            const priority = _bands[index].priority

            for (let i = priority; i < _bands.length; i++) {
                _bands[i].priority = (_bands[i].priority - 1)
            }
        }

        // remove the band
        bands.splice(index, 1)

        // update
        updateCallback(bands)
    }, [bands])

    /**
     * Add a new band
     */
    const addBand = useCallback(() => {
        bands.push(createDefaultShippingBand(bands.length + 1))

        updateCallback(bands)
    }, [bands])

    const editBandCallback = useCallback((band, index) => {
        bands[index] = band
        updateCallback(bands)
    }, [bands])

    /**
     * Swap the priority of two bands
     */
    const adjustPriority = useCallback((priority: number, direction: 'up' | 'down') => {

        // band to swap
        const a = bands.findIndex((band) => {
            return band.priority === priority
        })

        // band to swap with
        const b = bands.findIndex((band) => {
            return direction === 'up' ?
                band.priority === (priority - 1) :
                band.priority === (priority + 1)
        })

        bands[a].priority = bands[b].priority
        bands[b].priority = priority

        updateCallback(bands)
    }, [bands])

    return (
        <React.Fragment>
            <Card
                title={'Configured Bands'}
                actions={bands.length > -1 ? [
                    {
                        content: 'Add Band',
                        onAction() {
                            addBand()
                        }
                    }
                ] : []}
            >
                <Card.Section flush>
                    <ResourceList
                        emptyState={<EmptyState
                            heading={_T('App.Pages.Shipping.Bands.emptyStateTitle')}
                            action={{
                                content: _T('App.Pages.Shipping.Bands.emptyStateCta'),
                                onAction() {
                                    addBand()
                                }
                            }}
                            image="/emptystate-files.png"
                        >
                            <p>{_T('App.Pages.Shipping.Bands.emptyStateDescription')}</p>
                        </EmptyState>}
                        items={bands ? bands.sort((a, b) => a.priority - b.priority) : []}
                        renderItem={(band, index) => {
                            return (
                                <ResourceItem key={`band-${index}`} id={index} onClick={() => {}}>
                                    <Stack alignment={'center'}>
                                        <Stack.Item fill={true}>
                                            <TextStyle variation={'strong'}>{band.name}</TextStyle>
                                        </Stack.Item>
                                        <Stack.Item>
                                            <ButtonGroup segmented={true}>
                                                <Button
                                                    icon={CircleUpMajor}
                                                    size={'slim'}
                                                    onClick={() => {
                                                        adjustPriority(band.priority, 'up')
                                                    }}
                                                    disabled={band.priority === 1}
                                                />
                                                <Button
                                                    icon={CircleDownMajor}
                                                    size={'slim'}
                                                    onClick={() => {
                                                        adjustPriority(band.priority, 'down')
                                                    }}
                                                    disabled={band.priority === bands.length}
                                                />
                                                <Button
                                                    icon={EditMajor}
                                                    size={'slim'}
                                                    onClick={() => {
                                                        toggleEdit(index)
                                                    }}
                                                />
                                                <Button
                                                    destructive={true}
                                                    icon={DeleteMajor}
                                                    size={'slim'}
                                                    onClick={() => {
                                                        deleteBand(index)
                                                    }}
                                                />
                                            </ButtonGroup>
                                        </Stack.Item>
                                        {/** @ts-ignore */}
                                        {band.edit && <Stack.Item>
                                            <Card.Section flush>
                                                <EditBand
                                                    band={band}
                                                    index={parseInt(index)}
                                                    callback={editBandCallback}
                                                />
                                            </Card.Section>
                                        </Stack.Item>}
                                    </Stack>
                                </ResourceItem>
                            )
                        }}
                    />
                </Card.Section>
            </Card>
        </React.Fragment>
    )
}

export default ShippingBands