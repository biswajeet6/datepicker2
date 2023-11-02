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
import {useMutation, useQuery} from "react-query";
import useApi from "@/app/hooks/useApi";
import {IRule} from "@/app/types/store";
import LoadingBar from "@/app/components/common/LoadingBar";
import {useRouter} from 'next/router'
import {startOfDay} from "date-fns";
import {NoteMajor} from '@shopify/polaris-icons'
import LearnMoreFooter from '@/app/components/common/LearnMoreFooter'
import createDefaultRule from '../helpers/createDefaultRule'
import useShop from '@/app/providers/ShopProvider'

const RulesList: React.FC = (): JSX.Element => {

    const Api = useApi()

    const router = useRouter()

    const {shop} = useShop()

    const [newRuleSaving, setNewRuleSaving] = useState<boolean>(false)
    const [newRuleTitle, setNewRuleTitle] = useState<string>(null)
    const [modalAddRuleOpen, setModalAddRuleOpen] = useState<boolean>(false)

    const handleChangeNewRuleTitle = useCallback((value) => setNewRuleTitle(value), [])

    const queries = {
        rules: useQuery('rules', Api.rule.getByStoreId)
    }

    const mutations = {
        createRule: useMutation(Api.rule.insert, {
            onSuccess: (response) => {
                router.replace(`/rule/${response.id}`).then(() => {
                    setModalAddRuleOpen(false)
                    setNewRuleSaving(false)
                })
            },
            onError: (error) => {
                console.error(error)
                setNewRuleSaving(false)
            }
        })
    }

    const renderItemContent = (item: IRule): JSX.Element => {

        const activeFrom = () => {
            return (
                <React.Fragment>
                    <Caption>
                        Active from {item.active_from.start.toDateString()}
                        {item.active_from.end && <React.Fragment>
                            till {item.active_from.end.toDateString()}
                        </React.Fragment>}
                    </Caption>
                </React.Fragment>
            )
        }

        const appliesToProducts = () => {
            if (item.conditions.product_based.product_ids.length === 0) {
                return (<Badge>All products</Badge>)
            } else {
                // @ts-ignore
                <Badge>Applies to {item.conditions.product_based.product_idslength} product(s)</Badge>
            }
        }

        const appliesToRegions = () => {
            if (item.conditions.region_based.region_ids.length === 0) {
                return (<Badge>All regions</Badge>)
            } else {
                // @ts-ignore
                <Badge>Applies to {item.conditions.region_based.region_ids.length} region(s)</Badge>
            }
        }

        return (
            <React.Fragment>
                <Stack alignment={'center'}>
                    <Stack.Item fill>
                        <Stack vertical={true} spacing={'extraTight'}>
                            <Stack.Item>
                                <TextStyle variation={'strong'}>{item.title}</TextStyle>
                            </Stack.Item>
                            <Stack.Item>
                                {activeFrom()}
                            </Stack.Item>
                            <Stack.Item>
                                <Stack spacing={'tight'}>
                                    <Stack.Item>{appliesToRegions()}</Stack.Item>
                                    <Stack.Item>{appliesToProducts()}</Stack.Item>
                                </Stack>
                            </Stack.Item>
                        </Stack>
                    </Stack.Item>
                    <Stack.Item>
                        <Badge status={'success'}>Active</Badge>
                    </Stack.Item>
                </Stack>
            </React.Fragment>
        )
    }

    if (queries.rules.isLoading) {
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
                    title={_T('App.Pages.Rules.title')}
                    primaryAction={{
                        content: _T('App.Pages.Rules.addRule'),
                        onAction() {
                            setModalAddRuleOpen(true)
                        }
                    }}
                >
                    <Layout>
                        <Layout.Section>
                            <Card
                                title={_T('App.Pages.Rules.subTitle')}
                            >
                                <ResourceList
                                    loading={!queries.rules.data || queries.rules.isLoading}
                                    items={queries.rules.data ? queries.rules.data.data : []}
                                    renderItem={(rule: IRule) => {
                                        return (
                                            <ResourceItem
                                                id={rule._id}
                                                verticalAlignment={'center'}
                                                persistActions={true}
                                                url={`/rule/${rule._id}`}
                                                media={<Icon source={NoteMajor} color="base"/>}
                                                shortcutActions={[
                                                    {
                                                        content: _T('App.Common.viewEdit'),
                                                        url: `/rule/${rule._id}`
                                                    },
                                                ]}
                                            >{renderItemContent(rule)}</ResourceItem>
                                        )
                                    }}
                                />
                            </Card>
                        </Layout.Section>

                        <Layout.Section>
                            <LearnMoreFooter url={'[Client-Facing-Docs-URL]l/c/xtzBw1te'}
                                             label={'configuring custom rules'}/>
                        </Layout.Section>
                    </Layout>
                </Page>
            </Stage>
            <Modal
                open={modalAddRuleOpen}
                onClose={() => setModalAddRuleOpen(false)}
                primaryAction={{
                    loading: newRuleSaving,
                    content: 'Save',
                    onAction: () => {
                        const date = startOfDay(new Date())
                        setNewRuleSaving(true)
                        mutations.createRule.mutate(createDefaultRule(shop, newRuleTitle, date))
                    }
                }}
                title={_T('App.Pages.Rules.addRule')}
            >
                <Modal.Section>
                    <FormLayout>
                        <TextField label={'Rule Title'} value={newRuleTitle} onChange={handleChangeNewRuleTitle}/>
                    </FormLayout>
                </Modal.Section>
            </Modal>
        </React.Fragment>
    )
}

export default RulesList