import React, {useCallback, useEffect, useState} from 'react'
import {Button, DatePicker, FormLayout, TextField, TextStyle} from '@shopify/polaris'
import {IBlockedDate} from "@/app/types/store";
import {useMutation, useQuery, useQueryClient} from 'react-query'
import useApi from '@/app/hooks/useApi'
import {_T} from '@/app/providers/TextProvider'
import LoadingSpinner from '@/app/components/common/LoadingSpinner'

const BlockedDate: React.FC<{
    id: string,
    onSaveSuccessCallback(): void
}> = ({id, onSaveSuccessCallback}): JSX.Element => {

    const Api = useApi()

    const queryClient = useQueryClient()

    const [saving, setSaving] = useState<boolean>(false)
    const [{month, year}, setDate] = useState({
        month: null,
        year: null
    });
    const [titleError, setTitleError] = useState(null)
    const [blockedDate, setBlockedDate] = useState<IBlockedDate>(null)

    const queries = {
        blockedDate: useQuery(['blockedDate', id], async () => {
            return await Api.blockedDate.getById(id)
        })
    }

    const mutations = {
        updateBlockedDate: useMutation(Api.blockedDate.update, {
            onSuccess: () => {
                onSaveSuccessCallback()
                queryClient.invalidateQueries(['blockedDate', id]).then(() => {
                    setSaving(false)
                })
            },
            onError: () => {
                setSaving(false)
            }
        })
    }

    const handleChange = useCallback((value, key) => {
        setTitleError(null)
        setBlockedDate(Object.assign(
            {},
            blockedDate,
            {
                [`${key}`]: value
            }
        ))
    }, [blockedDate])

    const handleMonthChange = useCallback((month, year) => setDate({month, year}), []);

    const handleChangeSelectedDate = useCallback((selected) => {
        setBlockedDate(Object.assign(
            {},
            blockedDate,
            {
                start: selected.start,
                end: selected.end,
            }
        ))
    }, [blockedDate])

    const handleSave = () => {

        if (!blockedDate.title) {
            setTitleError('Please specify a title')
            return
        }

        setSaving(true)

        mutations.updateBlockedDate.mutate(blockedDate)
    }

    useEffect(() => {
        if (queries.blockedDate.data) {

            setDate({
                month: queries.blockedDate.data.start.getUTCMonth(),
                year: queries.blockedDate.data.start.getUTCFullYear()
            })

            setBlockedDate(queries.blockedDate.data)
        }
    }, [queries.blockedDate.data])

    return (
        <React.Fragment>
            {queries.blockedDate.isLoading && <LoadingSpinner/>}
            {queries.blockedDate.error && <React.Fragment>
                <TextStyle variation={'negative'}>Sorry, something went wrong.</TextStyle>
            </React.Fragment>}
            {blockedDate && <React.Fragment>
                <React.Fragment>
                    <FormLayout>
                        <TextField
                            id={'title'}
                            label={_T('App.Common.title')}
                            value={blockedDate.title}
                            onChange={handleChange}
                            error={titleError}
                        />
                        <TextStyle>{_T('App.Components.BlockedDate.rangePrompt')}</TextStyle>
                        <DatePicker
                            month={month}
                            year={year}
                            onChange={handleChangeSelectedDate}
                            onMonthChange={handleMonthChange}
                            selected={{
                                start: blockedDate.start,
                                end: blockedDate.end
                            }}
                            multiMonth
                            allowRange
                        />
                        <Button primary loading={saving} onClick={handleSave}>Save</Button>
                    </FormLayout>
                </React.Fragment>
            </React.Fragment>}
        </React.Fragment>

    )
}

export default BlockedDate