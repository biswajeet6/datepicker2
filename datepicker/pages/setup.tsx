import React, {useState} from 'react'
import Stage from '@/app/components/common/Stage'
import {Button, Card, DataTable, InlineError, Layout, Page, TextStyle} from '@shopify/polaris'
import SyncSetupButton from '@/app/components/setup/SyncWebhooksButton'
import {useMutation, useQuery, useQueryClient} from 'react-query'
import useApi from '@/app/hooks/useApi'
import {_T} from '@/app/providers/TextProvider'

const Setup: React.FC = (): JSX.Element => {

    const queryClient = useQueryClient()

    const Api = useApi()

    const [deleteCarrierServiceError, setDeleteCarrierServiceError] = useState(null)
    const [deleteCarrierServiceLoading, setDeleteCarrierServiceLoading] = useState(false)
    const [createCarrierServiceError, setCreateCarrierServiceError] = useState(null)
    const [createCarrierServiceLoading, setCreateCarrierServiceLoading] = useState(false)

    const queries = {
        carrierService: useQuery('carrierService', Api.store.getCarrierService)
    }

    const mutations = {
        deleteCarrierService: useMutation(Api.store.deleteCarrierService, {
            onSuccess: () => {
                setDeleteCarrierServiceLoading(false)
                queryClient.invalidateQueries('carrierService')
            },
            onError: (error) => {
                setDeleteCarrierServiceLoading(false)
                // @ts-ignore
                setDeleteCarrierServiceError(error.data.message)
            }
        }),
        createCarrierService: useMutation(Api.store.createCarrierService, {
            onSuccess: () => {
                setCreateCarrierServiceLoading(false)
                queryClient.invalidateQueries('carrierService')
            },
            onError: (error) => {
                setCreateCarrierServiceLoading(false)
                // @ts-ignore
                setCreateCarrierServiceError(error.data.message)
            }
        })
    }

    return (
        <Stage>
            <Page
                title={_T('App.Pages.Setup.title')}
            >
                <Layout>
                    {queries.carrierService.data && <Layout.Section>
                        <Card title={'Carrier Service'}>
                            {queries.carrierService.data.id && <React.Fragment>

                                <Card.Section>
                                    <DataTable
                                        columnContentTypes={[
                                            'text',
                                            'text',
                                            'text',
                                        ]}
                                        headings={[
                                            'ID',
                                            'Name',
                                            'Active',
                                        ]}
                                        rows={[
                                            [
                                                queries.carrierService.data.id,
                                                queries.carrierService.data.name,
                                                queries.carrierService.data.active ?
                                                    <TextStyle variation={'positive'}>active</TextStyle> :
                                                    <TextStyle variation={'negative'}>in-active</TextStyle>
                                            ]
                                        ]}
                                    />
                                </Card.Section>

                                <Card.Section>
                                    <Button
                                        id={'buttonDeleteCarrierService'}
                                        loading={deleteCarrierServiceLoading}
                                        onClick={() => {
                                            setDeleteCarrierServiceError(null)
                                            setDeleteCarrierServiceLoading(true)
                                            mutations.deleteCarrierService.mutate()
                                        }}
                                        destructive>Delete Carrier Service</Button>
                                    {deleteCarrierServiceError &&
                                    <InlineError message={deleteCarrierServiceError}
                                                 fieldID={'buttonDeleteCarrierService'}/>}
                                </Card.Section>
                            </React.Fragment>}

                            {!queries.carrierService.data.id && <React.Fragment>
                                <Card.Section>
                                    <Button
                                        id={'buttonCreateCarrierService'}
                                        loading={createCarrierServiceLoading}
                                        onClick={() => {
                                            setCreateCarrierServiceError(null)
                                            setCreateCarrierServiceLoading(true)
                                            mutations.createCarrierService.mutate()
                                        }}
                                        primary>Create Carrier Service</Button>
                                    <InlineError message={createCarrierServiceError}
                                                 fieldID={'buttonCreateCarrierService'}/>
                                </Card.Section>
                            </React.Fragment>}
                        </Card>
                    </Layout.Section>}
                    <Layout.Section>
                        <SyncSetupButton/>
                    </Layout.Section>
                </Layout>
            </Page>
        </Stage>
    )
}

export default Setup