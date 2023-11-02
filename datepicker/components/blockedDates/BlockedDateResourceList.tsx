import React, {useEffect, useState} from 'react'
import {Card, EmptyState, Modal, ResourceList} from '@shopify/polaris'
import {useMutation, useQuery, useQueryClient} from 'react-query'
import {IBlockedDate} from '@/app/types/store'
import BlockedDateResourceItem from '@/app/components/blockedDates/BlockedDateResourceItem'
import useApi from '@/app/hooks/useApi'
import {_T} from '@/app/providers/TextProvider'
import BlockedDate from '@/app/components/blockedDates/BlockedDate'
import useShop from '@/app/providers/ShopProvider'
import {endOfDay, startOfDay} from 'date-fns'

const BlockedDateResourceList: React.FC<{
    resourceId: string
}> = ({resourceId}): JSX.Element => {

    const queryClient = useQueryClient()

    const Api = useApi()

    const {shop} = useShop()

    const [modalEditBlockedDateOpen, setModalEditBlockedDateOpen] = useState<boolean>(false)
    const [activeBlockedDateId, setActiveBlockedDateId] = useState<string>(null)
    const [isEmpty, setIsEmpty] = useState<boolean>(true)

    const queries = {
        blockedDates: useQuery(['blockedDates', resourceId], async () => {
            return await Api.blockedDate.getByResourceId({
                resourceId: resourceId
            })
        })
    }

    const mutations = {
        deleteBlockedDate: useMutation(Api.blockedDate.delete, {
            onSuccess: () => {
                queryClient.invalidateQueries(['blockedDates', resourceId])
            }
        }),
        insertBlockedDate: useMutation(Api.blockedDate.insert, {
            onSuccess: (response) => {
                queryClient.invalidateQueries(['blockedDates', resourceId]).then(() => {
                    setActiveBlockedDateId(response.id)
                    setModalEditBlockedDateOpen(response.id)
                })
            }
        })
    }

    const callbackBlockDateDelete = (id: string) => {
        mutations.deleteBlockedDate.mutate(id)
    }

    const callbackBlockDateSelect = (id: string) => {
        setActiveBlockedDateId(id)
        setModalEditBlockedDateOpen(true)
    }

    const callbackBlockDateSave = () => {
        queryClient.invalidateQueries(['blockedDates', resourceId]).then(() => {
            setModalEditBlockedDateOpen(false)
        })
    }

    const handleAddBlockedDate = () => {

        // Intl.DateTimeFormat().resolvedOptions().timeZone

        const today = new Date()

        const start = startOfDay(today)

        const end = endOfDay(today)

        mutations.insertBlockedDate.mutate({
            store_id: shop,
            resource_id: resourceId,
            title: `Blocked Date [${(queries.blockedDates.data.data.length + 1)}]`,
            start: start,
            end: end,
        })
    }

    useEffect(() => {
        if (queries.blockedDates.data && queries.blockedDates.data.data.length > 0) {
            setIsEmpty(false)
        } else {
            setIsEmpty(true)
        }
    }, [queries.blockedDates.data])

    return (
        <React.Fragment>
            <Card
                title={isEmpty ? null : 'Selected Dates'}
                actions={isEmpty ? [] : [
                    {
                        content: 'Add Blocked Date',
                        onAction() {
                            handleAddBlockedDate()
                        }
                    }
                ]}
            >
                <Card.Section flush>
                    <ResourceList
                        loading={!queries.blockedDates.data}
                        items={queries.blockedDates.data ? queries.blockedDates.data.data : []}
                        emptyState={<EmptyState
                            heading={_T('App.Components.BlockedDate.emptyStateTitle')}
                            action={{
                                content: _T('App.Components.BlockedDate.emptyStateCta'),
                                onAction() {
                                    handleAddBlockedDate()
                                }
                            }}
                            image="/emptystate-files.png"
                        >
                            <p>{_T('App.Components.BlockedDate.emptyStateDescription')}</p>
                        </EmptyState>}
                        renderItem={(blockedDate: IBlockedDate) => {
                            return (
                                <React.Fragment>
                                    <BlockedDateResourceItem
                                        blockedDate={blockedDate}
                                        onDeleteCallback={callbackBlockDateDelete}
                                        onSelectCallback={callbackBlockDateSelect}
                                    />
                                </React.Fragment>
                            )
                        }}
                    />
                </Card.Section>
            </Card>
            <Modal
                title={_T('App.Pages.Configuration.editBlockedDateModal')}
                open={modalEditBlockedDateOpen}
                onClose={() => setModalEditBlockedDateOpen(false)}
                large
            >
                <Modal.Section>
                    <BlockedDate id={activeBlockedDateId} onSaveSuccessCallback={callbackBlockDateSave}/>
                </Modal.Section>
            </Modal>
        </React.Fragment>
    )
}

export default BlockedDateResourceList