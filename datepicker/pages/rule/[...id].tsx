import React, {useCallback, useEffect, useState} from 'react'
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
    TextField,
    TextStyle
} from '@shopify/polaris'
import ProductList from "@/app/components/rules/ProductList";
import {IProductRelationship, IRule} from "@/app/types/store";
import LoadingBar from "@/app/components/common/LoadingBar";
import {useMutation, useQuery, useQueryClient} from 'react-query'
import useApi from '@/app/hooks/useApi'
import {useRouter} from 'next/router'
import Stage from '@/app/components/common/Stage'
import {_T} from '@/app/providers/TextProvider'
import BlockedDateResourceList from '@/app/components/blockedDates/BlockedDateResourceList'
import {startOfDay} from 'date-fns'
import LearnMoreFooter from '@/app/components/common/LearnMoreFooter'
import LayoutSectionDescription from '@/app/components/common/LayoutSectionDescription'
import FormValidator from '@/app/utils/validator/FormValidator'
import RequiredValidator from '@/app/utils/validator/validators/RequiredValidator'
import NumericValidator from '@/app/utils/validator/validators/NumericValidator'

const validator = new FormValidator()

const formatDate = (date: Date): string => {
    return `${date.getUTCFullYear()}-${date.getUTCMonth() < 10 ? `0${(date.getUTCMonth() + 1)}` : (date.getUTCMonth() + 1)}-${date.getUTCDate() < 10 ? `0${(date.getUTCDate() + 1)}` : (date.getUTCDate() + 1)}`
}

const Rule: React.FC = (): JSX.Element => {

    const Api = useApi()

    const router = useRouter()

    const queryClient = useQueryClient()

    const [saving, setSaving] = useState<boolean>(false)

    const [valid, setValid] = useState<boolean>(true)

    const [rule, setRule] = useState<IRule>(null)

    const queries = {
        regions: useQuery('regions', Api.region.getByStoreId),
        rule: useQuery(['rule', router.query.id], async () => {
            if (!router.query.id && !rule) return null

            return await Api.rule.getById(router.query.id.toString())
        })
    }

    const mutations = {
        insertRule: useMutation(Api.rule.insert, {
            onSuccess: () => {
                queryClient.invalidateQueries(['rule', router.query.id]).then(() => {
                    setSaving(false)
                })
            },
            onError: (error) => {
                // @todo
                setSaving(false)
                console.error(error)
            }
        }),
        updateRule: useMutation(Api.rule.update, {
            onSuccess: () => {
                queryClient.invalidateQueries(['rule', router.query.id]).then(() => {
                    setSaving(false)
                })
            },
            onError: (error) => {
                // @todo
                setSaving(false)
                console.error(error)
            }
        }),
        deleteRule: useMutation(Api.rule.delete, {
            onSuccess: () => {
                queryClient.invalidateQueries('rules').then(() => {
                    router.push('/rules')
                })
            },
            onError: (error) => {
                console.error(error)
            }
        })
    }

    const handleChange = useCallback((value, key) => {
        setRule(Object.assign(
            {},
            rule,
            {
                [`${key}`]: value
            }
        ))
    }, [rule])

    const handleChangeProductionLimits = useCallback((value, key) => {
        setRule(Object.assign(
            {},
            rule,
            {
                production_limits: {
                    product_ids: rule.production_limits.product_ids,
                    [`${key}`]: value,
                }
            }
        ))
    }, [rule])

    const handleToggleCondition = useCallback((value, key) => {

        const _rule = rule

        switch (key) {
            case 'region_based_condition_disabled':
                _rule.conditions.region_based.enabled = false
                break;
            case 'region_based_condition_enabled':
                _rule.conditions.region_based.enabled = true
                break;
            case 'product_based_condition_disabled':
                _rule.conditions.product_based.enabled = false
                break;
            case 'region_based_condition_type':
                _rule.conditions.region_based.type = value
                break;
            case 'product_based_condition_enabled':
                _rule.conditions.product_based.enabled = true
                break;
            case 'product_based_condition_type':
                _rule.conditions.product_based.type = value
                break;
        }

        setRule({..._rule})
    }, [rule])

    const handleChangeSelectedRegions = useCallback((value) => {
        const _rule = rule

        _rule.conditions.region_based.region_ids = value

        setRule({..._rule})
    }, [rule])

    const handleActiveFromDateChange = useCallback((value, key) => {

        const active_from = rule.active_from

        active_from[key] = startOfDay(new Date(value))

        setRule(Object.assign(
            {},
            rule,
            {
                active_from: active_from
            }
        ))
    }, [rule])

    const productsSelectedConditionsCallback = useCallback((selected: IProductRelationship[]) => {
        const _rule = rule

        if (selected && selected.length) {
            _rule.conditions.product_based.product_ids = selected.map((p) => p.id)
        } else {
            _rule.conditions.product_based.product_ids = []
        }
        setRule({..._rule})
    }, [rule])

    const productsSelectedProductionLimitsCallback = useCallback((selected: IProductRelationship[]) => {
        const _rule = rule

        if (selected && selected.length) {
            _rule.production_limits.product_ids = selected.map((p) => p.id)
        } else {
            _rule.production_limits.product_ids = []
            _rule.production_limits.max_units_per_day = 0
        }
        setRule({..._rule})
    }, [rule])

    const handleSave = () => {
        setSaving(true)
        mutations.updateRule.mutate(rule)
    }

    useEffect(() => {
        setValid(validator.allValid())
    }, [rule])

    useEffect(() => {
        if (queries.rule.data && !rule) {
            setRule(queries.rule.data)
        }
    }, [queries.rule.data])

    // @todo this is causing a bug when loading the page after having had a previous record open. sort it out
    if (queries.rule.isLoading || !rule) return (
        <React.Fragment>
            <LoadingBar/>
        </React.Fragment>
    )

    if (queries.rule.error) return (
        <React.Fragment>
            Something went wrong...
        </React.Fragment>
    )

    return (
        <React.Fragment>
            <Stage>
                <Page
                    title={_T('App.Pages.Rules.Edit.title', {
                        ruleTitle: rule.title
                    })}
                    breadcrumbs={[
                        {
                            content: _T('App.Pages.Rules.title'),
                            url: '/rules',
                        }
                    ]}
                    actionGroups={[
                        {
                            title: 'Manage',
                            actions: [
                                {
                                    destructive: true,
                                    content: 'Delete',
                                    onAction: () => {
                                        mutations.deleteRule.mutate(rule._id)
                                    },
                                },
                            ],
                        },
                    ]}
                >
                    {rule && <React.Fragment>
                        <Layout>
                            <Layout.AnnotatedSection
                                title={'General settings'}
                                description={
                                    <LayoutSectionDescription
                                        description={'Configure the basic settings of this rule.'}
                                        link={{
                                            url: '[Client-Facing-Docs-URL]l/c/Zq7c5T3D'
                                        }}
                                    />
                                }>
                                <Card sectioned>
                                    <FormLayout>
                                        <TextField
                                            id={'title'}
                                            label={'Title'}
                                            value={rule.title}
                                            type={'text'}
                                            onChange={handleChange}
                                            error={validator.validate(
                                                'title',
                                                rule.title,
                                                [
                                                    new RequiredValidator(),
                                                ]
                                            )}
                                        />
                                        <FormLayout.Group>
                                            <TextField
                                                id={'start'}
                                                label={'Start Date'}
                                                value={rule.active_from.start ? formatDate(rule.active_from.start) : null}
                                                type={'date'}
                                                onChange={handleActiveFromDateChange}
                                            />
                                            <TextField
                                                id={'end'}
                                                label={'End Date'}
                                                value={rule.active_from.end ? formatDate(rule.active_from.end) : null}
                                                type={'date'}
                                                onChange={handleActiveFromDateChange}
                                            />
                                        </FormLayout.Group>
                                        <div className={'TextField-Small'}>
                                            <TextField
                                                id={'offset'}
                                                label={'Offset days'}
                                                helpText={'The default number of days this rule should offset the first selectable delivery day by'}
                                                inputMode={'numeric'}
                                                type={'number'}
                                                value={rule.offset.toString()}
                                                onChange={handleChange}
                                                error={validator.validate(
                                                    'offset',
                                                    rule.offset,
                                                    [
                                                        new RequiredValidator(),
                                                        new NumericValidator([
                                                            {
                                                                type: 'gte',
                                                                value: 0,
                                                            }
                                                        ])
                                                    ]
                                                )}
                                            />
                                        </div>
                                        <Checkbox
                                            id={'enabled'}
                                            label={'Enabled'}
                                            helpText={'Whether or not to enable the rule on save'}
                                            checked={rule.enabled}
                                            onChange={handleChange}
                                        />
                                    </FormLayout>
                                </Card>
                            </Layout.AnnotatedSection>

                            <Layout.AnnotatedSection
                                title={'Conditions'}
                                description={
                                    <LayoutSectionDescription
                                        description={'Choose which carts this rule applies to.'}
                                        link={{
                                            url: '[Client-Facing-Docs-URL]l/c/avbKAqQZ'
                                        }}
                                    />
                                }>
                                <Card sectioned>
                                    <FormLayout>
                                        <Stack vertical>
                                            <Stack.Item>
                                                <TextStyle variation={'strong'}>Regional conditions</TextStyle>
                                            </Stack.Item>
                                            <Stack.Item>
                                                <Stack vertical>
                                                    <RadioButton id={'region_based_condition_disabled'}
                                                                 onChange={handleToggleCondition}
                                                                 label={'Disable regional conditions'}
                                                                 checked={rule.conditions.region_based.enabled === false}/>
                                                    <RadioButton id={'region_based_condition_enabled'}
                                                                 onChange={handleToggleCondition}
                                                                 label={'Enable regional conditions'}
                                                                 checked={rule.conditions.region_based.enabled}/>
                                                </Stack>
                                            </Stack.Item>
                                            {rule.conditions.region_based.enabled && <Stack.Item>
                                                <Stack alignment={'center'}>
                                                    <Stack.Item>
                                                        <TextStyle>Applies to carts</TextStyle>
                                                    </Stack.Item>
                                                    <Stack.Item>
                                                        <Select
                                                            id={'region_based_condition_type'}
                                                            label={null}
                                                            onChange={handleToggleCondition}
                                                            value={rule.conditions.region_based.type}
                                                            options={[
                                                                {
                                                                    label: 'In',
                                                                    value: 'in',
                                                                },
                                                                {
                                                                    label: 'Not in',
                                                                    value: 'not_in',
                                                                },
                                                            ]}
                                                        />
                                                    </Stack.Item>
                                                    <Stack.Item>
                                                        <TextStyle>region(s):</TextStyle>
                                                    </Stack.Item>
                                                </Stack>
                                                <Stack>
                                                    <Stack.Item>
                                                        {queries.regions && queries.regions.data && <ChoiceList
                                                            name={'region_ids'}
                                                            title={null}
                                                            allowMultiple
                                                            selected={rule.conditions.region_based.region_ids}
                                                            onChange={handleChangeSelectedRegions}
                                                            choices={queries.regions.data.map((region) => {
                                                                return {
                                                                    label: region.name,
                                                                    value: region._id
                                                                }
                                                            })}
                                                        />}
                                                    </Stack.Item>
                                                </Stack>
                                            </Stack.Item>}
                                        </Stack>

                                        <Stack vertical>
                                            <Stack.Item>
                                                <TextStyle variation={'strong'}>Product conditions</TextStyle>
                                            </Stack.Item>
                                            <Stack.Item>
                                                <Stack vertical>
                                                    <RadioButton id={'product_based_condition_disabled'}
                                                                 onChange={handleToggleCondition}
                                                                 label={'Disable product conditions'}
                                                                 checked={rule.conditions.product_based.enabled === false}/>
                                                    <RadioButton id={'product_based_condition_enabled'}
                                                                 onChange={handleToggleCondition}
                                                                 label={'Enable product conditions'}
                                                                 checked={rule.conditions.product_based.enabled}/>
                                                </Stack>
                                            </Stack.Item>
                                            {rule.conditions.product_based.enabled && <Stack.Item>
                                                <Stack alignment={'center'}>
                                                    <Stack.Item>
                                                        <TextStyle>Applies to carts containing</TextStyle>
                                                    </Stack.Item>
                                                    <Stack.Item>
                                                        <Select
                                                            id={'product_based_condition_type'}
                                                            label={null}
                                                            onChange={handleToggleCondition}
                                                            value={rule.conditions.product_based.type}
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
                                                                    label: 'None',
                                                                    value: 'none',
                                                                },
                                                            ]}
                                                        />
                                                    </Stack.Item>
                                                    <Stack.Item>
                                                        <TextStyle>of the following products:</TextStyle>
                                                    </Stack.Item>
                                                </Stack>
                                                <Stack>
                                                    <Stack.Item>
                                                        <ProductList
                                                            initialSelectionIds={rule.conditions.product_based.product_ids.map((id) => {
                                                                return {id: id}
                                                            })} selectedCallback={productsSelectedConditionsCallback}/>
                                                    </Stack.Item>
                                                </Stack>
                                            </Stack.Item>}
                                        </Stack>
                                    </FormLayout>
                                </Card>
                            </Layout.AnnotatedSection>

                            <Layout.AnnotatedSection
                                title={'Production Limits'}
                                description={
                                    <LayoutSectionDescription
                                        description={'Apply production limits to products'}
                                        link={{
                                            url: '[Client-Facing-Docs-URL]l/c/H0pYC1dB'
                                        }}
                                    />
                                }>
                                <Card sectioned>
                                    <FormLayout>
                                        <ProductList
                                            initialSelectionIds={rule.production_limits.product_ids.map((id) => {
                                                return {id: id}
                                            })} selectedCallback={productsSelectedProductionLimitsCallback}/>
                                        {rule.production_limits.product_ids.length > 0 && <React.Fragment>
                                            <TextField
                                                id={'max_units_per_day'}
                                                label={'Maximum Units Per Day'}
                                                inputMode={'numeric'}
                                                type={'number'}
                                                value={rule.production_limits.max_units_per_day.toString()}
                                                onChange={handleChangeProductionLimits}
                                                error={validator.validate(
                                                    'max_units_per_day',
                                                    rule.production_limits.max_units_per_day,
                                                    [
                                                        new NumericValidator([
                                                            {
                                                                type: 'gte',
                                                                value: 0,
                                                            }
                                                        ])
                                                    ]
                                                )}
                                            />
                                        </React.Fragment>}
                                    </FormLayout>
                                </Card>
                            </Layout.AnnotatedSection>

                            <Layout.AnnotatedSection
                                title={'Blocked Delivery Days'}
                                description={
                                    <LayoutSectionDescription
                                        description={'Choose which days by default you can\'t deliver on. You can set product specific rules under \'Custom Rules\''}
                                        link={{
                                            url: '[Client-Facing-Docs-URL]l/c/r8KWBx0V'
                                        }}
                                    />
                                }>
                                <BlockedDateResourceList resourceId={rule._id}/>
                            </Layout.AnnotatedSection>

                            <Layout.Section>
                                <PageActions
                                    primaryAction={{
                                        content: _T('App.Common.save'),
                                        loading: saving,
                                        disabled: saving || !valid,
                                        onAction: () => {
                                            handleSave()
                                        }
                                    }}
                                    secondaryActions={[
                                        {
                                            content: 'Back',
                                            url: '/rules'
                                        }
                                    ]}
                                />
                            </Layout.Section>

                            <Layout.Section>
                                <Layout.Section>
                                    <LearnMoreFooter url={'[Client-Facing-Docs-URL]l/c/5c42quiw'}
                                                     label={'configuring custom rules'}/>
                                </Layout.Section>
                            </Layout.Section>
                        </Layout>
                    </React.Fragment>}
                </Page>
            </Stage>
        </React.Fragment>
    )
}

export default Rule