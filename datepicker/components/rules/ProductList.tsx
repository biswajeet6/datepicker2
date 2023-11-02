import React, {useEffect, useState} from "react"
import {ResourcePicker} from '@shopify/app-bridge-react'
import {Button} from '@shopify/polaris'

const ProductList = ({initialSelectionIds, selectedCallback}): JSX.Element => {

    const [pickerOpen, setPickerOpen] = useState<boolean>(false)

    const [selected, setSelected] = useState<{ id: string }[]>(initialSelectionIds)

    const renderButtonLabel = () => {
        return selected.length ? `Selected Products (${selected.length})` : 'Select Products'
    }

    useEffect(() => {
        selectedCallback(selected)
    }, [selected])

    return (
        <React.Fragment>
            <Button onClick={() => setPickerOpen(true)}>{renderButtonLabel()}</Button>
            <ResourcePicker
                resourceType={'Product'}
                open={pickerOpen}
                initialSelectionIds={selected}
                showVariants={false}
                showArchived={false}
                showDraft={false}
                selectMultiple={true}
                onSelection={(selectPayload) => {
                    const selected = selectPayload.selection.map((item) => {
                        return {
                            id: item.id,
                        }
                    })
                    setPickerOpen(false)
                    setSelected(selected)
                }}
                onCancel={() => {
                    setPickerOpen(false)
                }}
            />
        </React.Fragment>
    )
}

export default ProductList