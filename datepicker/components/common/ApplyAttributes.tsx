import {Button, Card, FormLayout, Layout, Stack, TextField} from '@shopify/polaris'
import React, {useCallback} from 'react'
import {IAttribute} from '@/app/types/store'
import {DeleteMajor} from '@shopify/polaris-icons'

interface Props {
    attributes: IAttribute[]

    onUpdate(attributes: IAttribute[])
}

const Attribute: React.FC<{
    attribute: IAttribute
    index: number
    handleUpdateAttribute(attribute: IAttribute, index: number)
    handleDeleteAttribute(index: number)
}> = ({attribute, index, handleUpdateAttribute, handleDeleteAttribute}): JSX.Element => {

    const handleUpdateKey = useCallback((value) => {
        const _attribute = attribute

        _attribute.name = value

        handleUpdateAttribute(_attribute, index)
    }, [attribute])

    const handleUpdateValue = useCallback((value) => {
        const _attribute = attribute

        _attribute.value = value

        handleUpdateAttribute(_attribute, index)
    }, [attribute])

    return (
        <React.Fragment>
            <FormLayout>
                <Stack distribution={'fill'}>
                    <Stack.Item>
                        <TextField
                            id={`attribute_name_${index}`}
                            label={null}
                            value={attribute.name}
                            placeholder={'Key'}
                            onChange={handleUpdateKey}
                        />
                    </Stack.Item>
                    <Stack.Item>
                        <TextField
                            id={`attribute_value_${index}`}
                            label={null}
                            value={attribute.value}
                            placeholder={'Value'}
                            onChange={handleUpdateValue}
                        />
                    </Stack.Item>
                    <Stack.Item>
                        <Button destructive={true} onClick={() => handleDeleteAttribute(index)} icon={DeleteMajor}/>
                    </Stack.Item>
                </Stack>
            </FormLayout>
        </React.Fragment>
    )
}

const ApplyAttributes: React.FC<Props> = ({attributes, onUpdate}): JSX.Element => {

    const handleUpdateAttribute = useCallback((attribute, index) => {
        const _attributes = attributes

        _attributes[index] = attribute

        onUpdate([..._attributes])
    }, [attributes])

    const handleAddNewAttribute = useCallback(() => {
        const _attributes = attributes

        _attributes.push({
            name: '',
            value: '',
        })

        onUpdate([..._attributes])
    }, [attributes])

    const handleDeleteAttribute = useCallback((index) => {

        let _attributes = attributes

        _attributes = _attributes.filter((d, i) => i !== index)

        onUpdate([..._attributes])
    }, [attributes])

    return (
        <React.Fragment>
            <Card
                sectioned actions={[
                {
                    content: 'Add New',
                    onAction: handleAddNewAttribute
                }
            ]}>
                <Layout>
                    <Layout.Section>
                        <Stack vertical={true}>
                            {(attributes.length > 0) && <React.Fragment>
                                {attributes.map((attribute, index) => {
                                    return (
                                        <Stack.Item key={`attribute_${index}`}>
                                            <Attribute
                                                attribute={attribute}
                                                index={index}
                                                handleUpdateAttribute={handleUpdateAttribute}
                                                handleDeleteAttribute={handleDeleteAttribute}
                                            />
                                        </Stack.Item>
                                    )
                                })}
                            </React.Fragment>}
                        </Stack>
                    </Layout.Section>
                </Layout>
            </Card>
        </React.Fragment>
    )
}

export default ApplyAttributes