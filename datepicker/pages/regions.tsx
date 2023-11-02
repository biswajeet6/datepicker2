import React, {useCallback, useState} from 'react'
import Stage from '@/app/components/common/Stage'
import {
    Badge,
    Caption,
    Card,
    FormLayout,
    Icon,
    Layout,
    Modal,
    Page,
    ResourceItem,
    ResourceList,
    Stack,
    TextField,
    TextStyle
} from '@shopify/polaris'
import {_T} from '@/app/providers/TextProvider'
import {useMutation, useQuery} from 'react-query'
import useApi, {IApiError} from "@/app/hooks/useApi";
import {IRegion} from "@/app/types/store";
import LoadingBar from "@/app/components/common/LoadingBar"
import {useRouter} from 'next/router'
import TestPostcode from '@/app/components/regions/TestPostcode'
import {GlobeMajor} from '@shopify/polaris-icons'
import LearnMoreFooter from '@/app/components/common/LearnMoreFooter'

const Regions: React.FC = (): JSX.Element => {

    const Api = useApi()

    const router = useRouter()

    const [modalAddRegionOpen, setModalAddRegionOpen] = useState<boolean>(false)
    const [modalOpenTestPostcode, setModalOpenTestPostcode] = useState<boolean>(false)

    const [newRegionSaving, setNewRegionSaving] = useState<boolean>(false)
    const [newRegionError, setNewRegionError] = useState<string>(null)
    const [newRegionName, setNewRegionName] = useState<string>(null)

    const handleChangeNewRegionName = useCallback((value) => {
        setNewRegionName(value)
        if (value === '') {
            setNewRegionError('required')
        } else {
            setNewRegionError(null)
        }
    }, [])

    const queries = {
        regions: useQuery('regions', Api.region.getByStoreId),
        shippingMethods: useQuery('shippingMethods', Api.shippingMethod.getByStoreId)
    }

    const mutations = {
        createRegion: useMutation(Api.region.insert, {
            onSuccess: (response) => {
                router.replace(`/region/${response.id}`).then(() => {
                    setNewRegionSaving(false)
                })
            },
            onError: (error: IApiError) => {
                setNewRegionError(error.message)
            }
        })
    }

    const renderRegionShippingMethods = (region: IRegion) => {
        if (
            !queries.shippingMethods ||
            queries.shippingMethods.isLoading ||
            !queries.shippingMethods.data
        ) {
            return null
        }

        const associatedMethods = queries.shippingMethods.data.filter((method) => method.region_ids.includes(region._id))

        return (
            <React.Fragment>
                <Stack spacing={'tight'}>
                    {associatedMethods.length > 0 && associatedMethods.map(method => (
                        <Badge
                            key={method._id}
                            status={(method.enabled && !method.archived) ? 'success' : 'warning'}>{`${method.name} (${method.service_code})${method.enabled ? '' : ' [disabled]'}`}
                        </Badge>))
                    }
                    {associatedMethods.filter(method => method.enabled).length === 0 &&
                    <Badge status={'critical'}>Warning! No enabled shipping method(s) are associated with
                        this region</Badge>}
                </Stack>
            </React.Fragment>
        )
    }

    if (queries.regions.isLoading || queries.shippingMethods.isLoading) {
        return (
            <React.Fragment>
                <LoadingBar/>
            </React.Fragment>
        )
    }

    return (
        <React.Fragment>
            <Stage>
                <Page
                    title={_T('App.Pages.Regions.title')}
                    primaryAction={{
                        content: _T('App.Pages.Regions.addRegion'),
                        onAction() {
                            setModalAddRegionOpen(true)
                        }
                    }}
                >
                    <Layout>
                        <Layout.Section>
                            <Card
                                title={'Configure your shipping regions'}
                                actions={[
                                    {
                                        content: _T('App.Pages.Regions.testPostcode'),
                                        onAction: () => {
                                            setModalOpenTestPostcode(true)
                                        }
                                    }
                                ]}
                            >
                                <ResourceList
                                    loading={!queries.regions.data || queries.regions.isLoading}
                                    items={queries.regions.data ? queries.regions.data : []}
                                    renderItem={(region: IRegion) => {
                                        return (
                                            <ResourceItem
                                                id={region._id}
                                                url={`/region/${region._id}`}
                                                persistActions={true}
                                                verticalAlignment={'center'}
                                                media={<Icon source={GlobeMajor} color="base"/>}
                                                shortcutActions={[
                                                    {
                                                        content: _T('App.Common.viewEdit'),
                                                        url: `/region/${region._id}`
                                                    }
                                                ]}
                                            >
                                                <Stack alignment={'center'}>
                                                    <Stack.Item fill>
                                                        <Stack vertical={true} spacing={'tight'}>
                                                            <Stack.Item>
                                                                <TextStyle
                                                                    variation={'strong'}>{region.name}</TextStyle>
                                                            </Stack.Item>
                                                            {(region.area_filters.length > 0) && <React.Fragment>
                                                                <Stack.Item>
                                                                    <Caption>Area code
                                                                        filters: {(region.area_filters.length > 0) && region.area_filters.join(', ')}</Caption>
                                                                </Stack.Item>
                                                            </React.Fragment>}
                                                            {(region.outcode_filters.length > 0) && <React.Fragment>
                                                                <Stack.Item>
                                                                    <Caption>Outcode
                                                                        filters: {(region.outcode_filters.length > 0) && region.outcode_filters.join(', ')}</Caption>
                                                                </Stack.Item>
                                                            </React.Fragment>}
                                                            <Stack.Item>
                                                                {renderRegionShippingMethods(region)}
                                                            </Stack.Item>
                                                        </Stack>
                                                    </Stack.Item>
                                                    <Stack.Item>
                                                        {region.default && <React.Fragment>
                                                            <Badge status={'info'}>Default</Badge>
                                                        </React.Fragment>}
                                                    </Stack.Item>
                                                </Stack>
                                            </ResourceItem>
                                        )
                                    }}
                                />
                            </Card>
                        </Layout.Section>

                        <Layout.Section>
                            <Layout.Section>
                                <LearnMoreFooter url={'[Client-Facing-Docs-URL]l/c/1i7UiXmM'}
                                                 label={'configuring regions'}/>
                            </Layout.Section>
                        </Layout.Section>
                    </Layout>
                </Page>
            </Stage>

            <Modal
                large
                title={_T('App.Pages.Regions.testPostcode')}
                open={modalOpenTestPostcode}
                onClose={() => setModalOpenTestPostcode(false)}
            >
                <Modal.Section>
                    <TestPostcode/>
                </Modal.Section>
            </Modal>

            <Modal
                title={_T('App.Pages.Regions.addRegion')}
                open={modalAddRegionOpen}
                onClose={() => setModalAddRegionOpen(false)}
                primaryAction={{
                    loading: newRegionSaving,
                    content: 'Save',
                    disabled: newRegionError !== null,
                    onAction: () => {
                        setNewRegionError(null)
                        setNewRegionSaving(true)
                        mutations.createRegion.mutate({
                            name: newRegionName
                        })
                    }
                }}
            >
                <Modal.Section>
                    <FormLayout>
                        <FormLayout.Group>
                            <TextField
                                id={'name'}
                                label={'Name'}
                                value={newRegionName}
                                onChange={handleChangeNewRegionName}
                                error={newRegionError}
                            />
                        </FormLayout.Group>
                    </FormLayout>
                </Modal.Section>
            </Modal>
        </React.Fragment>
    )
}

export default Regions