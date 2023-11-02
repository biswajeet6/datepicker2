import React, {useCallback, useEffect, useState} from 'react'
import {useRouter} from 'next/router'
import {IRegion} from '@/app/types/store'
import LoadingBar from '@/app/components/common/LoadingBar'
import {useMutation, useQuery, useQueryClient} from 'react-query'
import useApi, {IApiError} from '@/app/hooks/useApi'
import Stage from '@/app/components/common/Stage'
import {Card, FormLayout, InlineError, Layout, Page, PageActions, Stack, TextField, TextStyle} from '@shopify/polaris'
import {_T} from '@/app/providers/TextProvider'
import LearnMoreFooter from '@/app/components/common/LearnMoreFooter'
import LayoutSectionDescription from '@/app/components/common/LayoutSectionDescription'
import ApplyTags from '@/app/components/common/ApplyTags'
import useConfig from '@/app/providers/ConfigProvider'
import ApplyAttributes from '@/app/components/common/ApplyAttributes'

interface IParsedFilter {
    valid: boolean
    value: string
}

interface IParsedPostcodeFilter extends IParsedFilter {
    outcode: string
    area: string
    sector: string
}

interface IParsedSectorFilter extends IParsedFilter {
    area: string
    outcode: string
    sector: string
}

interface IParsedOutcodeFilter extends IParsedFilter {
    area: string
    outcode: string
}

interface IParsedAreaFilter extends IParsedFilter {
    area: string
}

type TParseFilters = (region: IRegion) => {
    postcode: IParsedPostcodeFilter[]
    sector: IParsedSectorFilter[]
    outcode: IParsedOutcodeFilter[]
    area: IParsedAreaFilter[]
}

const REGEX_POSTCODE_PARSERS = {
    postcode: /^(([A-Z][A-Z]{0,1})([0-9][A-Z0-9]{0,1})) {0,}(([0-9])([A-Z]{2}))$/i,
    sector: /^(((([A-Z][A-Z]{0,1})[0-9][A-Z0-9]{0,1}) {0,}[0-9])[A-Z]{0,})$/,
    outcode: /^(([A-Z][A-Z]{0,1})([0-9][A-Z0-9]{0,1}))$/i,
    area: /^([A-Z][A-Z]{0,1})$/i,
}

const FILTER_KEY_AREA = 'area'
const FILTER_KEY_OUTCODE = 'outcode'
const FILTER_KEY_SECTOR = 'sector'
const FILTER_KEY_POSTCODE = 'postcode'

/**
 * Determine order of precedence for two filter keys
 *
 * @param filterKey
 * @param testFilterKey
 */
const filterKeySuperseedsTestFilterKey = (filterKey: string, testFilterKey: string) => {
    const order = [
        FILTER_KEY_AREA,
        FILTER_KEY_OUTCODE,
        FILTER_KEY_SECTOR,
        FILTER_KEY_POSTCODE,
    ]
    return order.indexOf(filterKey) > order.indexOf(testFilterKey)
}

/**
 * Parse all filter inputs for the region into a typed object to be used for comparisons
 * Uses the various regex consts above to perform the mapping based on filter type
 * @param region
 */
const parseFilters: TParseFilters = (region) => {
    const parsed = {
        postcode: [],
        sector: [],
        outcode: [],
        area: [],
    }
    for (const key of Object.keys(parsed)) {
        if (parsed.hasOwnProperty(key)) {
            parsed[key] = region[`${key}_filters`].map((filter) => {
                const parts = filter.split(REGEX_POSTCODE_PARSERS[key])

                let result: IParsedFilter = {
                    valid: parts.length !== 1,
                    value: filter,
                }

                if (!result.valid) return result

                switch (key) {
                    case FILTER_KEY_POSTCODE:
                        const postcodeFilter: IParsedPostcodeFilter = {
                            valid: result.valid,
                            value: result.value,
                            sector: `${parts[1]}${parts[5]}`,
                            outcode: parts[1],
                            area: parts[2],
                        }
                        result = postcodeFilter
                        break
                    case FILTER_KEY_SECTOR:
                        const sectorFilter: IParsedSectorFilter = {
                            valid: result.valid,
                            value: result.value,
                            sector: parts[2],
                            outcode: parts[3],
                            area: parts[4],
                        }
                        result = sectorFilter
                        break
                    case FILTER_KEY_OUTCODE:
                        const outcodeFilter: IParsedOutcodeFilter = {
                            valid: result.valid,
                            value: result.value,
                            outcode: parts[1],
                            area: parts[2],
                        }
                        result = outcodeFilter
                        break
                    case FILTER_KEY_AREA:
                        const areaFilter: IParsedAreaFilter = {
                            valid: result.valid,
                            value: result.value,
                            area: parts[1]
                        }
                        result = areaFilter
                        break
                }
                return result
            })
        }
    }

    return parsed
}

const Region: React.FC = (): JSX.Element => {

    const Api = useApi()
    const router = useRouter()

    const queryClient = useQueryClient()

    const {config} = useConfig()

    const [region, setRegion] = useState<IRegion>(null)

    const [saving, setSaving] = useState<boolean>(false)

    const [regionNameError, setRegionNameError] = useState<string>(null)

    const [filterErrors, setFilterErrors] = useState({
        postcode: [],
        sector: [],
        outcode: [],
        area: [],
    })

    const hasFilterErrors = () => {
        return (
            filterErrors.postcode.length > 0 ||
            filterErrors.sector.length > 0 ||
            filterErrors.outcode.length > 0 ||
            filterErrors.area.length > 0
        )
    }

    const queries = {
        region: useQuery(['region', router.query.id], async () => {
            if (!router.query.id || region) return null

            return await Api.region.getById(router.query.id.toString())
        }),
        regions: useQuery(['regions'], Api.region.getByStoreId) // @todo might need to refresh on a debounced change / invalidate the "regions" index
    }

    const mutations = {
        update: useMutation(Api.region.update, {
            onSuccess: () => {
                queryClient.invalidateQueries('regions').then(() => {
                    queryClient.invalidateQueries(['region', router.query.id]).then(() => {
                        setSaving(false)
                    })
                })
            },
            onError: (error: IApiError) => {
                setSaving(false)
                console.error(error) // @todo display errors
            }
        }),
        delete: useMutation(Api.region.delete, {
            onSuccess: () => {
                queryClient.invalidateQueries('regions').then(() => {
                    router.push('/regions')
                })
            },
            onError: (error: IApiError) => {
                setSaving(false)
                console.error(error) // @todo display errors
            }
        })
    }

    /**
     * Quick approach to dynamically search for conflicts between different postcode filters, based of order of precedence
     *
     * @todo refactor...
     */
    useEffect(() => {
        if (!region || !queries.region) return

        // Initialise error array object, set to state at the end of the routine
        const errors = {
            postcode: [],
            sector: [],
            outcode: [],
            area: [],
        }

        // parse the filter inputs
        const parsedFilters = parseFilters(region)

        // check input has been parsed correctly
        for (const filterKey of Object.keys(parsedFilters)) {
            if (parsedFilters.hasOwnProperty(filterKey)) {
                for (const filter of parsedFilters[filterKey]) {

                    // check if filter parsed correctly, early continue if not
                    if (!filter.valid) {
                        errors[filterKey].push(`${filterKey} filter "${filter.value}" is invalid`)
                        continue
                    }

                    // check for conflicts with other regions
                    queries.regions.data.filter((r) => {
                        return (
                            !r.default &&
                            r._id !== region._id &&
                            r[`${filterKey}_filters`].includes(filter.value)
                        )
                    }).forEach((conflictingRegion) => {
                        errors[filterKey].push(`${filterKey} filter "${filter.value}" already exists in region "${conflictingRegion.name}"`)
                    })

                    // check for internal conflicts with other filters
                    for (const testFilterKey of Object.keys(parsedFilters)) {
                        if (parsedFilters.hasOwnProperty(testFilterKey) && filterKey !== testFilterKey) {
                            parsedFilters[testFilterKey].forEach((testFilter) => {

                                // determine which values we need to compare
                                const compareA = filterKeySuperseedsTestFilterKey(filterKey, testFilterKey) ? filter[testFilterKey] : filter.value
                                const compareB = filterKeySuperseedsTestFilterKey(filterKey, testFilterKey) ? testFilter.value : testFilter[filterKey]
                                if (compareA === compareB) {
                                    errors[filterKey].push(`${filterKey} filter "${filter.value} conflicts with ${testFilterKey} filter "${testFilter.value}"`)
                                }
                            })
                        }
                    }
                }
            }
        }
        setFilterErrors(errors)
    }, [region])

    const validateName = () => {
        setRegionNameError(null)

        if (region.name === '') {
            setRegionNameError('required')
            return
        }

        const nameExists = queries.regions.data.find((r) => (r.name.toLowerCase() === region.name.toLowerCase() && r._id !== region._id))

        if (nameExists) setRegionNameError('Region name already exists')
    }

    const handleChangeName = useCallback((value) => {
        region.name = value

        validateName()

        setRegion({...region})
    }, [region])

    const handleChangeFilter = useCallback((value, key) => {

        if (!value) {
            region[key] = []
        } else {
            region[key] = value.toUpperCase()
                .replace(' ', '')
                .split('\n')
        }

        setRegion({...region})
    }, [region])

    const handleUpdateApplyTags = useCallback((tags) => {
        const _region = region

        _region.apply_tags = tags

        setRegion({..._region})
    }, [region])

    const handleUpdateApplyAttributes = useCallback((attributes) => {
        const _region = region

        _region.apply_attributes = attributes

        setRegion({..._region})
    }, [region])

    const handleSave = () => {
        setSaving(true)

        const attributes =  region.apply_attributes 
            ? region.apply_attributes.filter(attribute => (attribute.name && attribute.value))
            : []

        mutations.update.mutate({
            regionId: region._id,
            fields: {
                name: region.name,
                postcode_filters: region.postcode_filters.filter(filter => filter !== ''),
                sector_filters: region.sector_filters.filter(filter => filter !== ''),
                outcode_filters: region.outcode_filters.filter(filter => filter !== ''),
                area_filters: region.area_filters.filter(filter => filter !== ''),
                apply_tags: region.apply_tags ?? [],
                apply_attributes: attributes,
            }
        })
    }

    useEffect(() => {
        if (queries.region.data) {
            setRegion(queries.region.data)
        }
    }, [queries.region.data])

    if (queries.region.isLoading || !region) return (
        <React.Fragment>
            <LoadingBar/>
        </React.Fragment>
    )

    if (queries.region.error) return (
        <React.Fragment>
            Something went wrong...
        </React.Fragment>
    )

    return (
        <React.Fragment>
            <Stage>
                <Page
                    title={_T('App.Pages.Regions.Edit.title', {
                        regionName: region.name
                    })}
                    breadcrumbs={[
                        {
                            content: _T('App.Pages.Regions.title'),
                            url: '/regions',
                        }
                    ]}
                    actionGroups={[
                        {
                            title: 'Manage',
                            actions: [
                                {
                                    disabled: region.default,
                                    destructive: true,
                                    content: 'Delete',
                                    onAction: () => {
                                        mutations.delete.mutate(region._id)
                                    },
                                },
                            ],
                        },
                    ]}
                >
                    <Layout.AnnotatedSection
                        title={'Region settings'}
                        description={
                            <LayoutSectionDescription
                                description={'Configure the settings of this region.'}
                                link={{
                                    url: '[Client-Facing-Docs-URL]l/c/1i7UiXmM'
                                }}
                            />
                        }
                    >
                        <Card sectioned>
                            {region && <React.Fragment>
                                <FormLayout>
                                    <TextField
                                        id={'name'}
                                        label={'Name'}
                                        value={region.name}
                                        type={'text'}
                                        onChange={handleChangeName}
                                        error={regionNameError}
                                    />
                                    {!region.default && <React.Fragment>
                                        <Stack vertical={true}>
                                            <Stack.Item>
                                                <TextField
                                                    id={'postcode_filters'}
                                                    label={'Postcode Filters'}
                                                    helpText={'Apply filters at postcode level, e.g. WD34AB'}
                                                    value={region.postcode_filters.join('\n')}
                                                    type={'text'}
                                                    multiline={region.postcode_filters.length > 4 ? region.postcode_filters.length : 4}
                                                    onChange={handleChangeFilter}
                                                    error={filterErrors.postcode.length > 0}
                                                />
                                            </Stack.Item>
                                            <Stack.Item>
                                                {filterErrors.postcode.map((error, index) => {
                                                    return (<InlineError key={index} message={error}
                                                                         fieldID='postcode_filters'/>)
                                                })}
                                            </Stack.Item>
                                            <Stack.Item>
                                                <TextField
                                                    id={'sector_filters'}
                                                    label={'Sector Filters'}
                                                    helpText={'Sectors let you specify at a more granular level which postcodes you want this rule to apply to, e.g. WD3 4'}
                                                    value={region.sector_filters.join('\n')}
                                                    type={'text'}
                                                    multiline={region.sector_filters.length > 4 ? region.sector_filters.length : 4}
                                                    onChange={handleChangeFilter}
                                                    error={filterErrors.sector.length > 0}
                                                />
                                            </Stack.Item>
                                            <Stack.Item>
                                                {filterErrors.sector.map((error, index) => {
                                                    return (<InlineError key={index} message={error}
                                                                         fieldID='sector_filters'/>)
                                                })}
                                            </Stack.Item>
                                            <Stack.Item>
                                                <TextField
                                                    id={'outcode_filters'}
                                                    label={'Outcode Filters'}
                                                    helpText={'Outcodes let you specify at a more granular level which postcodes you want this rule to apply to, e.g. SW12'}
                                                    value={region.outcode_filters.join('\n')}
                                                    type={'text'}
                                                    multiline={region.outcode_filters.length > 4 ? region.outcode_filters.length : 4}
                                                    onChange={handleChangeFilter}
                                                    error={filterErrors.outcode.length > 0}
                                                />
                                            </Stack.Item>
                                            <Stack.Item>
                                                {filterErrors.outcode.map((error, index) => {
                                                    return (<InlineError key={index} message={error}
                                                                         fieldID='outcode_filters'/>)
                                                })}
                                            </Stack.Item>
                                            <Stack.Item>
                                                <TextField
                                                    id={'area_filters'}
                                                    label={'Area Filters'}
                                                    helpText={'Area filters are broader level areas that you want this rule to apply to, e.g. SW'}
                                                    value={region.area_filters.join('\n')}
                                                    type={'text'}
                                                    multiline={region.area_filters.length > 4 ? region.area_filters.length : 4}
                                                    onChange={handleChangeFilter}
                                                    error={filterErrors.area.length > 0}
                                                />
                                            </Stack.Item>
                                            <Stack.Item>
                                                {filterErrors.area.map((error, index) => {
                                                    return (
                                                        <InlineError key={index} message={error}
                                                                     fieldID='area_filters'/>)
                                                })}
                                            </Stack.Item>
                                        </Stack>
                                    </React.Fragment>}
                                    {region.default && <React.Fragment>
                                        <h3>
                                            <TextStyle variation={'strong'}>
                                                This is the default region therefore no filtering can be applied
                                            </TextStyle>
                                        </h3>
                                    </React.Fragment>}
                                </FormLayout>
                            </React.Fragment>}
                        </Card>
                    </Layout.AnnotatedSection>

                    {(config && config.order_tagging_enabled) && <React.Fragment>
                        <Layout.AnnotatedSection
                            title={'Apply Tags'}
                            description={
                                <LayoutSectionDescription
                                    description={'Configure which tags should be applied to orders associated with this region'}
                                    link={{
                                        url: '[Client-Facing-Docs-URL]l/c/1u3m23iN'
                                    }}
                                />
                            }>
                            <Card sectioned>
                                <ApplyTags
                                    tags={region.apply_tags ?? []}
                                    onUpdate={handleUpdateApplyTags}
                                />
                            </Card>
                        </Layout.AnnotatedSection>
                        <Layout.AnnotatedSection
                            title={'Apply Attributes'}
                            description={
                                <LayoutSectionDescription
                                    description={'Configure which attributes should be applied to orders associated with this region'}
                                    link={{
                                        url: '[Client-Facing-Docs-URL]l/c/1u3m23iN'
                                    }}
                                />
                            }>
                            <ApplyAttributes
                                attributes={region.apply_attributes ?? []}
                                onUpdate={handleUpdateApplyAttributes}
                            />
                        </Layout.AnnotatedSection>
                    </React.Fragment>}

                    <Layout.Section>
                        <PageActions
                            primaryAction={{
                                content: _T('App.Common.save'),
                                loading: saving,
                                disabled: saving || hasFilterErrors(),
                                onAction: () => {
                                    handleSave()
                                }
                            }}
                            secondaryActions={[
                                {
                                    content: 'Back',
                                    url: '/regions'
                                }
                            ]}
                        />
                    </Layout.Section>

                    <Layout.Section>
                        <Layout.Section>
                            <LearnMoreFooter url={'[Client-Facing-Docs-URL]l/c/1i7UiXmM'}
                                             label={'configuring regions'}/>
                        </Layout.Section>
                    </Layout.Section>
                </Page>
            </Stage>
        </React.Fragment>
    )
}

export default Region