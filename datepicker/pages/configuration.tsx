import React, {useCallback, useEffect, useState} from 'react'
import Stage from '@/app/components/common/Stage'
import {Banner, Card, Checkbox, FormLayout, Layout, Page, PageActions, Select, Stack, TextField} from '@shopify/polaris'
import {IConfig} from '@/app/types/store'
import LoadingBar from '@/app/components/common/LoadingBar'
import useApi from '@/app/hooks/useApi'
import {useMutation, useQuery, useQueryClient} from 'react-query'
import BlockedDateResourceList from '@/app/components/blockedDates/BlockedDateResourceList'
import {_T} from '@/app/providers/TextProvider'
import LearnMoreFooter from '@/app/components/common/LearnMoreFooter'
import LayoutSectionDescription from '@/app/components/common/LayoutSectionDescription'
import {DEFAULT_REDIRECT_PATH} from '@/app/consts/app'
import FormValidator from '@/app/utils/validator/FormValidator'
import NumericValidator from '@/app/utils/validator/validators/NumericValidator'
import StringValidator from '@/app/utils/validator/validators/StringValidator'
import RequiredValidator from '@/app/utils/validator/validators/RequiredValidator'

const validator = new FormValidator()

const Configuration: React.FC = (): JSX.Element => {

    const queryClient = useQueryClient()

    const Api = useApi()

    const [saving, setSaving] = useState<boolean>(false)
    const [config, setConfig] = useState<IConfig>(null)
    const [error, setError] = useState<string>(null)
    const [valid, setValid] = useState<boolean>(true)

    const queries = {
        store: useQuery('store', Api.store.getById)
    }

    const mutations = {
        config: useMutation(Api.store.updateConfig, {
            onSuccess: () => {
                setError(null)
                setSaving(false)
                queryClient.invalidateQueries('config')
            },
            onError: () => {
                setSaving(false)
                setError('Sorry, something went wrong.')
            }
        })
    }

    const handleChange = useCallback((value, key) => {
        setConfig(Object.assign(
            {},
            config,
            {
                [`${key}`]: value
            }
        ))
    }, [config])

    const handleSaveConfig = useCallback(() => {
        setError(null)
        setSaving(true)
        mutations.config.mutate(config)
    }, [mutations])


    useEffect(() => {
        setValid(validator.allValid())
    }, [config])

    // Set initial state
    useEffect(() => {
        if (queries.store.data && !config) setConfig(queries.store.data.config)
    }, [queries.store.data])

    // Return loading if no config
    if (!queries.store) return (
        <React.Fragment>
            <LoadingBar/>
        </React.Fragment>
    )

    return (
        <React.Fragment>
            <Stage>
                <Page
                    title={_T('App.Pages.Configuration.title')}
                    breadcrumbs={[
                        {
                            content: _T('App.Pages.Dashboard.title'),
                            url: DEFAULT_REDIRECT_PATH,
                        }
                    ]}
                >
                    <Layout>

                        <Layout.AnnotatedSection
                            title={'General settings'}
                            description={
                                <LayoutSectionDescription
                                    description={'Configure the default settings of your custom shipping rates'}
                                    link={{
                                        url: '[Client-Facing-Docs-URL]l/c/FDKi0ZMe',
                                    }}/>
                            }>
                            <Card>
                                {error && <React.Fragment>
                                    <Card.Section>
                                        <Banner status="warning">{error}</Banner>
                                    </Card.Section>
                                </React.Fragment>}
                                <Card.Section>
                                    {config && <React.Fragment>
                                        <Stack vertical={true}>
                                            <Stack.Item>
                                                <FormLayout>
                                                    <div className={'TextField-Small'}>
                                                        <Select
                                                            id={'timezone'}
                                                            label={'Timezone'}
                                                            disabled={true}
                                                            helpText={null}
                                                            value={config.timezone.toString()}
                                                            options={[
                                                                {
                                                                    label: 'Europe/London',
                                                                    value: 'Europe/London',
                                                                }
                                                            ]}
                                                            onChange={handleChange}
                                                        />
                                                    </div>
                                                    <div className={'TextField-Small'}>
                                                        <TextField
                                                            id={'window'}
                                                            label={'Maximum delivery window'}
                                                            helpText={'The maximum number days in the future that you allow customers to place orders'}
                                                            inputMode={'numeric'}
                                                            error={validator.validate('window', config.window, [
                                                                new RequiredValidator(),
                                                                new NumericValidator([
                                                                    {type: 'gte', value: 1}
                                                                ])
                                                            ])}
                                                            type={'number'}
                                                            suffix={'days'}
                                                            value={config.window.toString()}
                                                            onChange={handleChange}
                                                        />
                                                    </div>
                                                    <div className={'TextField-Small'}>
                                                        <TextField
                                                            id={'max_orders'}
                                                            label={'Maximum daily order limit'}
                                                            helpText={'The maximum number of orders you can accept in a single day'}
                                                            inputMode={'numeric'}
                                                            error={validator.validate('max_orders', config.max_orders, [
                                                                new RequiredValidator(),
                                                                new NumericValidator([
                                                                    {type: 'gte', value: 1}
                                                                ])
                                                            ])}
                                                            type={'number'}
                                                            value={config.max_orders.toString()}
                                                            onChange={handleChange}
                                                        />
                                                    </div>
                                                    <Checkbox
                                                        id={'carrier_test_mode_enabled'}
                                                        label={'Enable Carrier Test Mode'}
                                                        helpText={'Enable this to put the carrier integration into test mode'}
                                                        checked={config.carrier_test_mode_enabled}
                                                        onChange={handleChange}
                                                    />
                                                    {config.carrier_test_mode_enabled && <React.Fragment>
                                                        <div className={'TextField-Small'}>
                                                            <TextField
                                                                id={'carrier_test_mode_match'}
                                                                label={'Carrier Test Mode Match'}
                                                                helpText={'Setup a unique string to use as the address line one for shipping rate requests'}
                                                                inputMode={'text'}
                                                                type={'text'}
                                                                error={validator.validate('carrier_test_mode_match', config.carrier_test_mode_match, [
                                                                    new RequiredValidator(),
                                                                    new StringValidator()
                                                                ])}
                                                                value={config.carrier_test_mode_match}
                                                                onChange={handleChange}
                                                            />
                                                        </div>
                                                    </React.Fragment>}
                                                </FormLayout>
                                            </Stack.Item>
                                            <Stack.Item fill>
                                                <Banner
                                                    title="Maximum limits"
                                                    status={'info'}
                                                    action={{
                                                        content: 'Set custom rules',
                                                        url: '/rules'
                                                    }}
                                                    secondaryAction={{
                                                        content: 'Learn more',
                                                        url: '[Client-Facing-Docs-URL]l/c/Ja2evU8F'
                                                    }}
                                                >
                                                    <p>Your maximum limits will apply site wide but you can customise
                                                        them at a product level too.</p>
                                                </Banner>
                                            </Stack.Item>
                                        </Stack>
                                    </React.Fragment>}
                                </Card.Section>
                            </Card>
                        </Layout.AnnotatedSection>

                        <Layout.AnnotatedSection
                            title={'Blocked Delivery Days'}
                            description={
                                <LayoutSectionDescription
                                    description={'Choose which days by default you can\'t deliver on. You can set product specific rules under \'Custom Rules\''}
                                    link={{
                                        url: '[Client-Facing-Docs-URL]l/c/BL4D2F0C',
                                    }}/>
                            }
                        >
                            {queries.store.data && <React.Fragment>
                                <BlockedDateResourceList resourceId={queries.store.data._id}/>
                            </React.Fragment>}
                        </Layout.AnnotatedSection>

                        <Layout.Section>
                            <PageActions
                                primaryAction={{
                                    content: _T('App.Common.save'),
                                    loading: saving,
                                    disabled: saving || !valid,
                                    onAction: () => {
                                        handleSaveConfig()
                                    }
                                }}
                                secondaryActions={[
                                    {
                                        content: 'Back',
                                        url: DEFAULT_REDIRECT_PATH,
                                    }
                                ]}
                            />
                        </Layout.Section>

                        <Layout.Section>
                            <LearnMoreFooter url={'[Client-Facing-Docs-URL]l/c/hKRzxWPV'}
                                             label={'configuring your app'}/>
                        </Layout.Section>
                    </Layout>
                </Page>
            </Stage>
        </React.Fragment>
    )
}

export default Configuration