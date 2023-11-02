import React, {useCallback, useEffect, useState} from 'react'
import {useRouter} from 'next/router'
import {IShippingMethod} from '@/app/types/store'
import LoadingBar from '@/app/components/common/LoadingBar'
import {useMutation, useQuery, useQueryClient} from 'react-query'
import useApi, {IApiError} from '@/app/hooks/useApi'
import Stage from '@/app/components/common/Stage'
import {
    Card,
    Checkbox,
    ChoiceList,
    FormLayout,
    Layout,
    Page,
    PageActions,
    RadioButton,
    Select,
    Stack,
    TextContainer,
    TextField,
    TextStyle,
} from '@shopify/polaris'
import {_T} from '@/app/providers/TextProvider'
import DispatchDay from '@/app/components/shippingMethods/DispatchDay'
import DeliveryDay from '@/app/components/shippingMethods/DeliveryDay'
import LearnMoreFooter from '@/app/components/common/LearnMoreFooter'
import LayoutSectionDescription from '@/app/components/common/LayoutSectionDescription'
import FormValidator from '@/app/utils/validator/FormValidator'
import RequiredValidator from '@/app/utils/validator/validators/RequiredValidator'
import StringValidator from '@/app/utils/validator/validators/StringValidator'
import NumericValidator from '@/app/utils/validator/validators/NumericValidator'
import ShippingBands from '@/app/components/shippingBands/ShippingBands'
import useConfig from '@/app/providers/ConfigProvider'
import ApplyTags from '@/app/components/common/ApplyTags'
import ProductSelectInput from '@/app/components/shippingBands/conditionInputs/ProductSelectInput'
import ApplyAttributes from '@/app/components/common/ApplyAttributes'
import BlockedDateResourceList from '@/app/components/blockedDates/BlockedDateResourceList'

const validator = new FormValidator()

const ShippingMethod: React.FC = (): JSX.Element => {

    const Api = useApi()
    const router = useRouter()

    const queryClient = useQueryClient()

    const {config} = useConfig()

    const [shippingMethod, setShippingMethod] = useState<IShippingMethod>(null)

    const [saving, setSaving] = useState<boolean>(false)

    const [valid, setValid] = useState<boolean>(true)

    const queries = {
        shippingMethod: useQuery(['shipping_method', router.query.id], async () => {
            if (!router.query.id || shippingMethod) return null

            return await Api.shippingMethod.getById(router.query.id.toString())
        }),
        regions: useQuery(['regions'], Api.region.getByStoreId),
    }

    const handleToggleCondition = useCallback((value, key) => {

        const _shippingMethod = shippingMethod

        switch (key) {
            case 'product_based_condition_disabled':
                _shippingMethod.conditions.product_based.enabled = false
                break;
            case 'product_based_condition_enabled':
                _shippingMethod.conditions.product_based.enabled = true
                break;
            case 'product_based_condition_type':
                _shippingMethod.conditions.product_based.type = value
                break;
            case 'weight_based_condition_disabled':
                _shippingMethod.conditions.weight_based.enabled = false
                break;
            case 'weight_based_condition_enabled':
                _shippingMethod.conditions.weight_based.enabled = true
                break;
            case 'weight_based_condition_type':
                _shippingMethod.conditions.weight_based.value = {
                    min: 0,
                    max: 0,
                }
                _shippingMethod.conditions.weight_based.type = value
                break;
            case 'weight_based_condition_value_min':
                _shippingMethod.conditions.weight_based.value.min = parseInt(value)
                break;
            case 'weight_based_condition_value_max':
                _shippingMethod.conditions.weight_based.value.max = parseInt(value)
                break;
            case 'sku_based_condition_disabled':
                _shippingMethod.conditions.sku_based.enabled = false
                break;
            case 'sku_based_condition_enabled':
                _shippingMethod.conditions.sku_based.enabled = true
                break;
            case 'sku_based_condition_type':
                _shippingMethod.conditions.sku_based.type = value
                break;
            case 'sku_based_condition_value':
                _shippingMethod.conditions.sku_based.value = value
                break;
            case 'sku_based_condition_partial_match':
                _shippingMethod.conditions.sku_based.partial_match = value
                break;
            case 'custom_condition_enabled':
                _shippingMethod.conditions.custom.enabled = true
                break;
            case 'custom_condition_disabled':
                _shippingMethod.conditions.custom.enabled = true
                break;
            case 'custom_condition_script':
                _shippingMethod.conditions.custom.script = value
                break;
        }

        setShippingMethod({..._shippingMethod})
    }, [shippingMethod])

    const productsSelectedConditionsCallback = useCallback((selected) => {

        console.info(selected)

        const _shippingMethod = shippingMethod

        _shippingMethod.conditions.product_based.product_ids = selected

        setShippingMethod({..._shippingMethod})
    }, [shippingMethod])

    const mutations = {
        update: useMutation(Api.shippingMethod.update, {
            onSuccess: () => {
                queryClient.invalidateQueries(['shipping_method', router.query.id]).then(() => {
                    setSaving(false)
                })
            },
            onError: (error: IApiError) => {
                setSaving(false)
                console.error(error) // @todo display errors
            }
        }),
        delete: useMutation(Api.shippingMethod.delete, {
            onSuccess: () => {
                queryClient.invalidateQueries('shipping_methods').then(() => {
                    router.push('/shippingMethods')
                })
            },
            onError: (error) => {
                console.error(error)
            }
        })
    }

    const handleUpdateBandsCallback = useCallback((value) => {
        const _method = shippingMethod

        _method.bands = value

        setShippingMethod({..._method})
    }, [shippingMethod])

    const handleChange = useCallback((value, key) => {
        shippingMethod[key] = value
        setShippingMethod({...shippingMethod})
    }, [shippingMethod])

    const handleChangeSelectedRegions = useCallback((value) => {
        shippingMethod.region_ids = value
        setShippingMethod({...shippingMethod})
    }, [shippingMethod])

    /**
     * @todo this is awful and there will be a far far better way of handling state management for the delivery / dispatch components than this travesty
     * I've just rushed something together
     */
    const handleChangeDispatchDay = useCallback((value, key) => {
        const method = shippingMethod
        const parts = key.split('.')
        method.dispatch_days[parts[0]][parts[1]] = value
        setShippingMethod({...method})
    }, [shippingMethod])

    const handleChangeDeliveryDay = useCallback((value, key) => {
        const method = shippingMethod
        const parts = key.split('.')
        method.delivery_days[parts[0]][parts[1]] = value
        setShippingMethod({...method})
    }, [shippingMethod])

    const handleUpdateApplyTags = useCallback((tags) => {
        const _method = shippingMethod

        _method.apply_tags = tags

        setShippingMethod({..._method})
    }, [shippingMethod])


    const handleUpdateApplyAttributes = useCallback((attributes) => {
        const _shippingMethod = shippingMethod

        _shippingMethod.apply_attributes = attributes

        setShippingMethod({..._shippingMethod})
    }, [shippingMethod])

    useEffect(() => {
        if (queries.shippingMethod.data) {
            setShippingMethod(queries.shippingMethod.data)
        }
    }, [queries.shippingMethod.data])

    useEffect(() => {
        setValid(validator.allValid())
    }, [shippingMethod])

    if (queries.shippingMethod.isLoading || !shippingMethod) return (
        <React.Fragment>
            <LoadingBar/>
        </React.Fragment>
    )

    if (queries.shippingMethod.error) return (
        <React.Fragment>
            Something went wrong...
        </React.Fragment>
    )

    return (
        <React.Fragment>
            <Stage>
                <Page
                    title={_T('App.Pages.Shipping.Edit.title', {
                        shippingMethodName: shippingMethod.name
                    })}
                    breadcrumbs={[
                        {
                            content: _T('App.Pages.Regions.title'),
                            url: '/shippingMethods',
                        }
                    ]}
                    actionGroups={[
                        /*
                        // @todo deleting methods after orders have been placed and associated to the methods has not been tested.
                        // aggregation may need to be adjusted to include archived
                        // encourage store not to delete methods. Instead disable.
                        {
                            title: 'Manage',
                            actions: [
                                {
                                    destructive: true,
                                    content: 'Delete',
                                    onAction: () => {
                                        mutations.delete.mutate(shippingMethod._id)
                                    },
                                },
                            ],
                        },
                        */
                    ]}
                >
                    {shippingMethod && <Layout>
                        <Layout.AnnotatedSection
                            title={'General settings'}
                            description={
                                <LayoutSectionDescription
                                    description={'Configure the basic settings of this shipping method.'}
                                    link={{
                                        url: '[Client-Facing-Docs-URL]l/c/Hwf1xm3M'
                                    }}
                                />
                            }>
                            <Card sectioned>
                                <React.Fragment>
                                    <FormLayout>
                                        <TextField
                                            id={'name'}
                                            label={'Name'}
                                            helpText={'The name of the method'}
                                            value={shippingMethod.name}
                                            type={'text'}
                                            onChange={handleChange}
                                            error={validator.validate(
                                                'name',
                                                shippingMethod.name,
                                                [
                                                    new RequiredValidator(),
                                                    new StringValidator(),
                                                ]
                                            )}
                                        />
                                        <TextField
                                            id={'description'}
                                            label={'Description'}
                                            helpText={'The description of the method'}
                                            value={shippingMethod.description}
                                            type={'text'}
                                            onChange={handleChange}
                                            error={validator.validate(
                                                'description',
                                                shippingMethod.description,
                                                [
                                                    new StringValidator(),
                                                ]
                                            )}
                                        />
                                        <Select
                                            id={'type'}
                                            disabled={true}
                                            label={'Type'}
                                            options={[
                                                {
                                                    label: 'Domestic',
                                                    value: 'domestic',
                                                }
                                            ]}
                                            onChange={handleChange}
                                        />
                                        <TextField
                                            id={'service_code'}
                                            label={'Service Code'}
                                            helpText={'The service code of the method'}
                                            value={shippingMethod.service_code}
                                            type={'text'}
                                            onChange={handleChange}
                                            error={validator.validate(
                                                'service_code',
                                                shippingMethod.service_code,
                                                [
                                                    new RequiredValidator(),
                                                    new StringValidator(),
                                                ]
                                            )}
                                        />
                                        <TextField
                                            id={'price'}
                                            label={'Price'}
                                            helpText={'The price of the method'}
                                            value={shippingMethod.price.toString()}
                                            type={'text'}
                                            onChange={handleChange}
                                            error={validator.validate(
                                                'price',
                                                shippingMethod.price,
                                                [
                                                    new RequiredValidator(),
                                                    new NumericValidator([
                                                        {
                                                            type: 'gte',
                                                            value: 0,
                                                        }
                                                    ]),
                                                ]
                                            )}
                                        />
                                        <TextField
                                            id={'daily_order_limit'}
                                            label={'Daily Order Limit'}
                                            helpText={'The maximum number of orders this method can fulfill per day (set as 0 for infinite)'}
                                            value={shippingMethod.daily_order_limit.toString()}
                                            type={'number'}
                                            onChange={handleChange}
                                            error={validator.validate(
                                                'daily_order_limit',
                                                shippingMethod.daily_order_limit,
                                                [
                                                    new RequiredValidator(),
                                                    new NumericValidator([
                                                        {
                                                            type: 'gte',
                                                            value: 0,
                                                        }
                                                    ]),
                                                ]
                                            )}
                                        />
                                        <Checkbox
                                            id={'required_phone'}
                                            name={'required_phone'}
                                            label={'Phone Number Required'}
                                            helpText={'Whether or not a phone number is required for the method'}
                                            checked={shippingMethod.required_phone}
                                            onChange={handleChange}
                                        />
                                        <Checkbox
                                            id={'enabled'}
                                            name={'enabled'}
                                            label={'Enabled'}
                                            helpText={'When enabled this method will show in checkout for relevant orders'}
                                            checked={shippingMethod.enabled}
                                            onChange={handleChange}
                                        />
                                    </FormLayout>
                                </React.Fragment>
                            </Card>
                        </Layout.AnnotatedSection>

                        <Layout.AnnotatedSection
                            title={'Conditions'}
                            description={
                                <LayoutSectionDescription
                                    description={'Choose which carts this shipping method is available for'}
                                    link={{
                                        url: '[Client-Facing-Docs-URL]l/c/d1SVX1eX'
                                    }}
                                />
                            }>
                            {shippingMethod.conditions.product_based && <Card title={'Product based'} sectioned>
                                <Stack vertical>
                                    <Stack.Item>
                                        <Stack vertical>
                                            <RadioButton id={'product_based_condition_disabled'}
                                                         onChange={handleToggleCondition}
                                                         label={'Disable product conditions'}
                                                         checked={shippingMethod.conditions.product_based.enabled === false}/>
                                            <RadioButton id={'product_based_condition_enabled'}
                                                         onChange={handleToggleCondition}
                                                         label={'Enable product conditions'}
                                                         checked={shippingMethod.conditions.product_based.enabled}/>
                                        </Stack>
                                    </Stack.Item>
                                    {shippingMethod.conditions.product_based.enabled && <React.Fragment>
                                        <Stack.Item>
                                            <Stack vertical>
                                                <Stack.Item>
                                                    <TextStyle>Available to carts with</TextStyle>
                                                </Stack.Item>
                                                <Stack.Item>
                                                    <Select
                                                        id={'product_based_condition_type'}
                                                        label={null}
                                                        onChange={handleToggleCondition}
                                                        value={shippingMethod.conditions.product_based.type}
                                                        options={[
                                                            {
                                                                label: 'At Least One',
                                                                value: 'at_least_one',
                                                            },
                                                            {
                                                                label: 'All',
                                                                value: 'all',
                                                            },
                                                            {
                                                                label: 'Only',
                                                                value: 'only',
                                                            },
                                                            {
                                                                label: 'None',
                                                                value: 'none',
                                                            },
                                                        ]}
                                                    />
                                                </Stack.Item>
                                                <Stack.Item>
                                                    <ProductSelectInput
                                                        value={shippingMethod.conditions.product_based.product_ids}
                                                        callback={productsSelectedConditionsCallback}
                                                    />
                                                </Stack.Item>
                                            </Stack>
                                        </Stack.Item>
                                    </React.Fragment>}
                                </Stack>
                            </Card>}
                            {shippingMethod.conditions.weight_based && <Card title={'Weight based'} sectioned>
                                <Stack vertical>
                                    <Stack.Item>
                                        <Stack vertical>
                                            <RadioButton id={'weight_based_condition_disabled'}
                                                         onChange={handleToggleCondition}
                                                         label={'Disable weight conditions'}
                                                         checked={shippingMethod.conditions.weight_based.enabled === false}/>
                                            <RadioButton id={'weight_based_condition_enabled'}
                                                         onChange={handleToggleCondition}
                                                         label={'Enable weight conditions'}
                                                         checked={shippingMethod.conditions.weight_based.enabled}/>
                                        </Stack>
                                    </Stack.Item>
                                    {shippingMethod.conditions.weight_based.enabled && <React.Fragment>
                                        <Stack.Item>
                                            <Stack vertical>
                                                <Stack.Item>
                                                    <TextStyle>Available to carts which weigh</TextStyle>
                                                </Stack.Item>
                                                <Stack.Item>
                                                    <Select
                                                        id={'weight_based_condition_type'}
                                                        label={null}
                                                        onChange={handleToggleCondition}
                                                        value={shippingMethod.conditions.weight_based.type}
                                                        options={[
                                                            {
                                                                label: 'Greater than',
                                                                value: 'greater_than',
                                                            },
                                                            {
                                                                label: 'Less than',
                                                                value: 'less_than',
                                                            },
                                                            {
                                                                label: 'Equal to',
                                                                value: 'equal',
                                                            },
                                                            {
                                                                label: 'Between',
                                                                value: 'between',
                                                            },
                                                        ]}
                                                    />
                                                </Stack.Item>
                                                <Stack.Item>
                                                    <Stack alignment={'center'}>
                                                        {['greater_than', 'equal', 'between'].includes(shippingMethod.conditions.weight_based.type) &&
                                                        <React.Fragment>
                                                            <TextField
                                                                id={'weight_based_condition_value_min'}
                                                                label={null}
                                                                type={'number'}
                                                                onChange={handleToggleCondition}
                                                                value={shippingMethod.conditions.weight_based.value.min.toString()}
                                                                suffix={'grams'}
                                                            />
                                                        </React.Fragment>}
                                                        {shippingMethod.conditions.weight_based.type === 'between' &&
                                                        <React.Fragment>
                                                            <Stack.Item>
                                                                <TextStyle
                                                                    variation={'subdued'}>and</TextStyle>
                                                            </Stack.Item>
                                                        </React.Fragment>}
                                                        {['less_than', 'between'].includes(shippingMethod.conditions.weight_based.type) &&
                                                        <React.Fragment>
                                                            <TextField
                                                                id={'weight_based_condition_value_max'}
                                                                label={null}
                                                                type={'number'}
                                                                onChange={handleToggleCondition}
                                                                value={shippingMethod.conditions.weight_based.value.max.toString()}
                                                                suffix={'grams'}
                                                            />
                                                        </React.Fragment>}
                                                    </Stack>
                                                </Stack.Item>
                                            </Stack>
                                        </Stack.Item>
                                    </React.Fragment>}
                                </Stack>
                            </Card>}
                            {shippingMethod.conditions.sku_based && <Card title={'SKU based'} sectioned>
                                <Stack vertical>
                                    <Stack.Item>
                                        <Stack vertical>
                                            <RadioButton id={'sku_based_condition_disabled'}
                                                         onChange={handleToggleCondition}
                                                         label={'Disable SKU conditions'}
                                                         checked={shippingMethod.conditions.sku_based.enabled === false}/>
                                            <RadioButton id={'sku_based_condition_enabled'}
                                                         onChange={handleToggleCondition}
                                                         label={'Enable SKU conditions'}
                                                         checked={shippingMethod.conditions.sku_based.enabled}/>
                                        </Stack>
                                    </Stack.Item>
                                    {shippingMethod.conditions.sku_based.enabled && <React.Fragment>
                                        <Stack.Item>
                                            <Stack vertical>
                                                <Stack.Item>
                                                    <TextStyle>Available to carts with SKUs matching</TextStyle>
                                                </Stack.Item>
                                                <Stack.Item>
                                                    <Select
                                                        id={'sku_based_condition_type'}
                                                        label={null}
                                                        onChange={handleToggleCondition}
                                                        value={shippingMethod.conditions.sku_based.type}
                                                        options={[
                                                            {
                                                                label: 'At Least One',
                                                                value: 'at_least_one',
                                                            },
                                                            {
                                                                label: 'Only',
                                                                value: 'only',
                                                            },
                                                            {
                                                                label: 'None',
                                                                value: 'none',
                                                            },
                                                        ]}
                                                    />
                                                </Stack.Item>
                                                <Stack.Item>
                                                    <TextField
                                                        id={'sku_based_condition_value'}
                                                        label={null}
                                                        type={'text'}
                                                        onChange={handleToggleCondition}
                                                        value={shippingMethod.conditions.sku_based.value}
                                                        helpText={'List of comma separated SKUs or partial SKUs to filter by'}
                                                        placeholder={'SKU-A,SKU-B,SKU-C'}
                                                    />
                                                </Stack.Item>
                                                <Stack.Item>
                                                    <Checkbox
                                                        label={'Use partial match'}
                                                        id={'sku_based_condition_partial_match'}
                                                        checked={shippingMethod.conditions.sku_based.partial_match}
                                                        onChange={handleToggleCondition}
                                                        helpText={'With partial matching enabled the condition will check for the presence of the partial SKU rather than for an exact match'}
                                                    />
                                                </Stack.Item>
                                            </Stack>
                                        </Stack.Item>
                                    </React.Fragment>}
                                </Stack>
                            </Card>}
                            {
                                // Disabled for now as needs to be tested for security purposes
                            }
                            {(shippingMethod.conditions.custom && false) && <Card title={'Custom'} sectioned>
                                <Stack vertical>
                                    <Stack.Item>
                                        <Stack vertical>
                                            <RadioButton id={'custom_condition_disabled'}
                                                         onChange={handleToggleCondition}
                                                         label={'Disable custom conditions'}
                                                         checked={shippingMethod.conditions.custom.enabled === false}/>
                                            <RadioButton id={'custom_condition_enabled'}
                                                         onChange={handleToggleCondition}
                                                         label={'Enable custom conditions'}
                                                         checked={shippingMethod.conditions.custom.enabled}/>
                                        </Stack>
                                    </Stack.Item>
                                    {shippingMethod.conditions.custom.enabled && <React.Fragment>
                                        <Stack.Item>
                                            <Stack vertical>
                                                <Stack.Item>
                                                    <TextField
                                                        id={'custom_condition_script'}
                                                        label={null}
                                                        type={'text'}
                                                        onChange={handleToggleCondition}
                                                        value={shippingMethod.conditions.custom.script}
                                                        helpText={'Enter a custom script to evaluate your condition with'}
                                                        multiline={5}
                                                    />
                                                </Stack.Item>
                                            </Stack>
                                        </Stack.Item>
                                    </React.Fragment>}
                                </Stack>
                            </Card>}
                        </Layout.AnnotatedSection>

                        {(config && config.order_tagging_enabled) && <React.Fragment>
                            <Layout.AnnotatedSection
                                title={'Apply Tags'}
                                description={
                                    <LayoutSectionDescription
                                        description={'Configure which tags should be applied to orders using this shipping method'}
                                        link={{
                                            url: '[Client-Facing-Docs-URL]l/c/1u3m23iN'
                                        }}
                                    />
                                }>
                                <Card sectioned>
                                    <ApplyTags
                                        tags={shippingMethod.apply_tags ?? []}
                                        onUpdate={handleUpdateApplyTags}
                                    />
                                </Card>
                            </Layout.AnnotatedSection>
                            <Layout.AnnotatedSection
                                title={'Apply Attributes'}
                                description={
                                    <LayoutSectionDescription
                                        description={'Configure which attributes should be applied to orders associated with this shipping method'}
                                        link={{
                                            url: '[Client-Facing-Docs-URL]l/c/1u3m23iN'
                                        }}
                                    />
                                }>
                                <ApplyAttributes
                                    attributes={shippingMethod.apply_attributes ?? []}
                                    onUpdate={handleUpdateApplyAttributes}
                                />
                            </Layout.AnnotatedSection>
                        </React.Fragment>}

                        <Layout.AnnotatedSection
                            title={'Bands'}
                            description={
                                <LayoutSectionDescription
                                    description={'Configure shipping bands to apply different rates for the shipping method based on the customers cart'}
                                    link={{
                                        url: '[Client-Facing-Docs-URL]l/c/6As30if0'
                                    }}
                                />
                            }>
                            <ShippingBands
                                bands={shippingMethod.bands ?? []}
                                updateCallback={handleUpdateBandsCallback}
                            />
                        </Layout.AnnotatedSection>

                        <Layout.AnnotatedSection
                            title={'Delivery Promise'}
                            description={
                                <LayoutSectionDescription
                                    description={'Specify when customers should expect to receive their order with this shipping method'}
                                    link={{
                                        url: '[Client-Facing-Docs-URL]l/c/apPk8nxH'
                                    }}
                                />
                            }>
                            <Card sectioned>
                                <FormLayout>
                                    <FormLayout.Group condensed>
                                        <TextField
                                            id={'promise_start'}
                                            label={''}
                                            helpText={'Delivered between (x) and (x) days from dispatch day'}
                                            value={shippingMethod.promise_start.toString()}
                                            onChange={handleChange}
                                            error={validator.validate(
                                                'promise_start',
                                                shippingMethod.promise_start,
                                                [
                                                    new RequiredValidator(),
                                                    new NumericValidator([
                                                        {
                                                            type: 'lte',
                                                            value: shippingMethod.promise_end,
                                                        }
                                                    ]),
                                                ]
                                            )}
                                        />
                                        <TextField
                                            id={'promise_end'}
                                            label={''}
                                            value={shippingMethod.promise_end.toString()}
                                            onChange={handleChange}
                                            error={validator.validate(
                                                'promise_end',
                                                shippingMethod.promise_end,
                                                [
                                                    new RequiredValidator(),
                                                    new NumericValidator([
                                                        {
                                                            type: 'gte',
                                                            value: shippingMethod.promise_start,
                                                        }
                                                    ]),
                                                ]
                                            )}
                                        />
                                    </FormLayout.Group>
                                    <Checkbox
                                            id={'only_promise_delivery_days'}
                                            name={'only_promise_delivery_days'}
                                            label={'Only Promise Delivery days'}
                                            helpText={'Calculations are made based only off enabled delivery days'}
                                            checked={shippingMethod.only_promise_delivery_days}
                                            onChange={handleChange}
                                        />
                                </FormLayout>
                            </Card>
                        </Layout.AnnotatedSection>

                        <Layout.AnnotatedSection
                            title={'Dispatch Days'}
                            description={
                                <LayoutSectionDescription
                                    description={'Set which days of the week you dispatch orders with this shipping method'}
                                    link={{
                                        url: '[Client-Facing-Docs-URL]l/c/QKmJvDvU'
                                    }}
                                />
                            }>
                            <Card sectioned>
                                <TextContainer>
                                    <TextStyle>Available dispatch days</TextStyle>
                                </TextContainer>
                                <FormLayout>
                                    <Stack vertical={true} spacing={'extraTight'}>
                                        {Object.keys(shippingMethod.dispatch_days).map((key) => {
                                            return (
                                                <Stack.Item key={`dispatch_day_${key}`}>
                                                    <DispatchDay
                                                        dispatchDay={shippingMethod.dispatch_days[key]}
                                                        onChangeCallback={handleChangeDispatchDay}
                                                    />
                                                </Stack.Item>
                                            )
                                        })}
                                    </Stack>
                                </FormLayout>
                            </Card>
                        </Layout.AnnotatedSection>

                        <Layout.AnnotatedSection
                            title={'Delivery Days'}
                            description={
                                <LayoutSectionDescription
                                    description={'Set which days of the week you deliver orders with this shipping method'}
                                    link={{
                                        url: '[Client-Facing-Docs-URL]l/c/QKmJvDvU'
                                    }}
                                />
                            }>
                            <Card sectioned>
                                <TextContainer>
                                    <TextStyle>Available delivery days</TextStyle>
                                </TextContainer>
                                <FormLayout>
                                    <Stack vertical={true} spacing={'extraTight'}>
                                        {Object.keys(shippingMethod.delivery_days).map((key) => {
                                            return (
                                                <Stack.Item key={`delivery_day_${key}`}>
                                                    <DeliveryDay
                                                        deliveryDay={shippingMethod.delivery_days[key]}
                                                        onChangeCallback={handleChangeDeliveryDay}
                                                    />
                                                </Stack.Item>
                                            )
                                        })}
                                    </Stack>
                                </FormLayout>
                            </Card>
                        </Layout.AnnotatedSection>

                        <Layout.AnnotatedSection
                            title={'Blocked Delivery Days'}
                            description={
                                <LayoutSectionDescription
                                    description={'Choose which days this shipping method can\'t deliver on.'}
                                    link={{
                                        url: '[Client-Facing-Docs-URL]l/c/BL4D2F0C',
                                    }}/>
                            }>
                            {shippingMethod._id && <React.Fragment>
                                <BlockedDateResourceList resourceId={shippingMethod._id}/>
                            </React.Fragment>}
                        </Layout.AnnotatedSection>

                        <Layout.AnnotatedSection
                            title={'Regions'}
                            description={
                                <LayoutSectionDescription
                                    description={'Choose which region(s) this rule applies to.'}
                                    link={{
                                        url: '[Client-Facing-Docs-URL]l/c/hVg0L1pi'
                                    }}
                                />
                            }>
                            <Card sectioned>
                                <FormLayout>
                                    {queries.regions && queries.regions.data && <ChoiceList
                                        name={'region_ids'}
                                        title={'Available to regions (leave blank if this method is available to all regions)'}
                                        allowMultiple
                                        selected={shippingMethod.region_ids}
                                        onChange={handleChangeSelectedRegions}
                                        choices={queries.regions.data.map((region) => {
                                            return {
                                                label: region.name,
                                                value: region._id
                                            }
                                        })}
                                    />}
                                </FormLayout>
                            </Card>
                        </Layout.AnnotatedSection>

                        <Layout.Section>
                            <PageActions
                                primaryAction={{
                                    content: _T('App.Common.save'),
                                    loading: saving,
                                    disabled: saving || !valid,
                                    onAction: () => {
                                        setSaving(true)

                                        const _shippingMethod = shippingMethod

                                        _shippingMethod.apply_attributes = _shippingMethod.apply_attributes 
                                            ? _shippingMethod.apply_attributes.filter(attribute => (attribute.name && attribute.value)) 
                                            : []

                                        mutations.update.mutate(shippingMethod)
                                    }
                                }}
                                secondaryActions={[
                                    {
                                        content: 'Back',
                                        url: '/shippingMethods'
                                    }
                                ]}
                            />
                        </Layout.Section>

                        <Layout.Section>
                            <Layout.Section>
                                <LearnMoreFooter url={'[Client-Facing-Docs-URL]l/c/zscnmVoY'}
                                                 label={'configuring shipping methods'}/>
                            </Layout.Section>
                        </Layout.Section>
                    </Layout>}
                </Page>
            </Stage>
        </React.Fragment>
    )
}

export default ShippingMethod
