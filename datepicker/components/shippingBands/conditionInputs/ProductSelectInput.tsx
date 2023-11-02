import {Button, Stack } from '@shopify/polaris'
import React, {useCallback, useState} from 'react'
import {ResourcePicker} from '@shopify/app-bridge-react'


const ProductSelectInput: React.FC<{
    value: {id: string}[]
    callback(value: number)
}> = ({ value, callback }): JSX.Element => {

    const [pickerOpen, setPickerOpen] = useState<boolean>(false)
    const [selected, setSelected] = useState<{ id: string }[]>(value)

    const renderButtonLabel = () => {
        return selected.length ? `Selected Products (${selected.length})` : 'Select Products'
    }

    const handleChange = useCallback((payload) => {
        const selected = payload.selection.map((item) => {
            return {
                id: item.id,
                variants: item.variants.map((variant) => {
                    return {
                        id: variant.id
                    }
                })
            }
        })
        setSelected(selected)
        setPickerOpen(false)
        callback(selected)
    }, [selected])

    return (
        <React.Fragment>
            <Stack>
                <Stack.Item>
                    <Button onClick={() => setPickerOpen(true)}>{renderButtonLabel()}</Button>
                    <ResourcePicker
                        resourceType={'Product'}
                        open={pickerOpen}
                        initialSelectionIds={selected}
                        showVariants={true}
                        showArchived={false}
                        showDraft={false}
                        selectMultiple={true}
                        onSelection={handleChange}
                        onCancel={() => {
                            setPickerOpen(false)
                        }}
                    />
                </Stack.Item>
            </Stack>
        </React.Fragment>
    )
}

export default ProductSelectInput