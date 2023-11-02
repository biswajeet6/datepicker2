import React, {useCallback, useState} from 'react'
import Stage from '@/app/components/common/Stage'
import {
    Badge,
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
import {IShippingMethod} from "@/app/types/store";
import LoadingBar from "@/app/components/common/LoadingBar"
import {useRouter} from 'next/router'
import {ShipmentMajor} from '@shopify/polaris-icons'
import LearnMoreFooter from '@/app/components/common/LearnMoreFooter'

const ShippingMethods: React.FC = (): JSX.Element => {

    const Api = useApi()

    const router = useRouter()

    const [modalAddMethodOpen, setModalAddMethodOpen] = useState<boolean>(false)

    const [newMethodSaving, setNewMethodSaving] = useState<boolean>(false)
    const [newMethodError, setNewMethodError] = useState<string>(null)
    const [newMethodName, setNewMethodName] = useState<string>(null)

    const handleChangeNewMethodName = useCallback((value) => setNewMethodName(value), [])

    const queries = {
        shippingMethods: useQuery('shipping_methods', Api.shippingMethod.getByStoreId)
    }

    const mutations = {
        createMethod: useMutation(Api.shippingMethod.insert, {
            onSuccess: (response) => {
                router.replace(`/shippingMethod/${response.id}`).then(() => {
                    setNewMethodSaving(false)
                })
            },
            onError: (error: IApiError) => {
                setNewMethodError(error.message)
            }
        })
    }

    if (queries.shippingMethods.isLoading) {
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
                    title={_T('App.Pages.Shipping.title')}
                    primaryAction={{
                        content: _T('App.Pages.Shipping.addMethod'),
                        onAction() {
                            setModalAddMethodOpen(true)
                        }
                    }}
                >
                    <Layout>
                        <Layout.Section>
                            <Card
                                title={'Configure your shipping methods'}
                            >
                                <ResourceList
                                    loading={!queries.shippingMethods.data || queries.shippingMethods.isLoading}
                                    items={queries.shippingMethods.data ? queries.shippingMethods.data : []}
                                    renderItem={(shippingMethod: IShippingMethod) => {
                                        return (
                                            <ResourceItem
                                                id={shippingMethod._id}
                                                verticalAlignment="center"
                                                url={`/shippingMethod/${shippingMethod._id}`}
                                                media={<Icon source={ShipmentMajor} color="base"/>}
                                                persistActions={true}
                                                shortcutActions={[
                                                    {
                                                        content: _T('App.Common.viewEdit'),
                                                        url: `/shippingMethod/${shippingMethod._id}`
                                                    }
                                                ]}
                                            >

                                                <Stack vertical={true} spacing={'extraTight'}>
                                                    <Stack.Item><TextStyle
                                                        variation={'strong'}>{shippingMethod.name}</TextStyle></Stack.Item>
                                                    {shippingMethod.service_code && <React.Fragment>
                                                        <Stack.Item><Badge>{shippingMethod.service_code}</Badge></Stack.Item>
                                                    </React.Fragment>}
                                                </Stack>
                                            </ResourceItem>
                                        )
                                    }}
                                />
                            </Card>
                        </Layout.Section>

                        <Layout.Section>
                            <Layout.Section>
                                <LearnMoreFooter url={'[Client-Facing-Docs-URL]l/c/zscnmVoY'}
                                                 label={'configuring shipping methods'}/>
                            </Layout.Section>
                        </Layout.Section>
                    </Layout>
                </Page>
            </Stage>
            <Modal
                title={_T('App.Pages.Shipping.addMethod')}
                open={modalAddMethodOpen}
                onClose={() => setModalAddMethodOpen(false)}
                primaryAction={{
                    loading: newMethodSaving,
                    content: 'Save',
                    onAction: () => {
                        setNewMethodError(null)
                        setNewMethodSaving(true)
                        mutations.createMethod.mutate({
                            name: newMethodName
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
                                value={newMethodName}
                                onChange={handleChangeNewMethodName} error={newMethodError}
                            />
                        </FormLayout.Group>
                    </FormLayout>
                </Modal.Section>
            </Modal>
        </React.Fragment>
    )
}

export default ShippingMethods