import React, {useCallback, useState} from 'react'
import {Button, Card, Checkbox, DataTable, Stack, TextStyle} from '@shopify/polaris'
import {_T} from '@/app/providers/TextProvider'
import useApi from '@/app/hooks/useApi'
import {useQuery, useQueryClient} from 'react-query'
import {ISyncWebhookResult} from '../../pages/api/syncWebhooks'

const SyncSetupButton: React.FC = (): JSX.Element => {

    const [loading, setLoading] = useState(false)

    const [response, setResponse] = useState(null)

    const [forceReset, setForceReset] = useState(false)

    const [syncResults, setSyncResults] = useState<ISyncWebhookResult[]>([])

    const Api = useApi()

    const queryClient = useQueryClient()

    const handleChangeForceReset = useCallback((value) => {
        setForceReset(value)
    }, [forceReset])

    const queries = {
        webhookSubscriptions: useQuery(['webhookSubscriptions'], Api.store.getWebhookSubscriptions),
    }

    const handleClick = () => {

        setSyncResults([])
        setResponse(null)
        setLoading(true)

        Api.store.syncWebhookSubscriptions(forceReset).then((response) => {
            console.info(response)

            setSyncResults(response)
            setLoading(false)
            setResponse('Success')
        }).catch((error) => {
            console.error(error)

            setLoading(false)
            setResponse('Something went wrong.')
        }).finally(() => {
            queryClient.invalidateQueries(['webhookSubscriptions'])
        })
    }

    return (
        <React.Fragment>
            <Card title={'Webhooks'}>
                <Card.Section title={'Webhook Actions'}>
                    <Stack>
                        <Stack.Item>
                            <Button onClick={() => handleClick()}
                                    destructive
                                    loading={loading}>
                                {_T('App.Pages.Setup.Buttons.syncWebhooks')}
                            </Button>
                        </Stack.Item>
                        <Stack.Item>
                            <Checkbox
                                label={'Force Reset'}
                                helpText={'Removes all existing webhooks created by the app and then creates them again'}
                                checked={forceReset}
                                onChange={handleChangeForceReset}
                            />
                        </Stack.Item>
                    </Stack>
                </Card.Section>
                {syncResults.length > 0 && <React.Fragment>
                    <Card.Section title={'Sync Results'}>
                        {queries.webhookSubscriptions.data && <React.Fragment>
                            <DataTable
                                columnContentTypes={[
                                    'text',
                                    'text',
                                    'text',
                                ]}
                                headings={[
                                    'Topic',
                                    'Type',
                                    'Success',
                                ]}
                                rows={syncResults.map((syncResult) => {
                                    return [
                                        syncResult.topic,
                                        syncResult.type,
                                        syncResult.success ? <TextStyle variation={'positive'}>true</TextStyle> :
                                            <TextStyle variation={'negative'}>false</TextStyle>,
                                    ]
                                })}
                            />
                        </React.Fragment>}
                    </Card.Section>
                </React.Fragment>}
                <Card.Section title={'Existing Webhooks'}>
                    {queries.webhookSubscriptions.data && <React.Fragment>
                        <DataTable
                            columnContentTypes={[
                                'text',
                                'text',
                            ]}
                            headings={[
                                'ID',
                                'Topic',
                            ]}
                            rows={queries.webhookSubscriptions.data.map((webhookSubscription) => {
                                return [
                                    webhookSubscription.id,
                                    webhookSubscription.topic
                                ]
                            })}
                        />
                    </React.Fragment>}
                </Card.Section>
            </Card>
        </React.Fragment>
    )
}

export default SyncSetupButton