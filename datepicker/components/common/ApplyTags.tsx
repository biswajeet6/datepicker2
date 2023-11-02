import { Button, FormLayout, Layout, Stack, Tag, TextField } from '@shopify/polaris'
import React, {useCallback, useState} from 'react'

interface Props {
    tags: string[]
    onUpdate(tags: string[])
}

const ApplyTags: React.FC<Props> = ({ tags, onUpdate }): JSX.Element => {

    const [newTag, setNewTag] = useState<string>(null)

    const handleChangeNewTag = useCallback((value) => {
        setNewTag(value)
    }, [newTag])

    const handleClearNewTag = useCallback(() => {
        setNewTag(null)
    }, [newTag])

    const handleAdd = useCallback(() => {
        const _tags = tags

        _tags.push(newTag.trim())

        onUpdate([..._tags])

        setNewTag(null)
    }, [newTag])

    const removeTag = useCallback((removeTag) => () => {
        onUpdate([...tags.filter(tag => tag !== removeTag)])
    }, [tags])

    return (
        <React.Fragment>
            <Layout>
                <Layout.Section>
                    <FormLayout>
                        <TextField
                            id={'add_tag'}
                            label={'Add Tag'}
                            value={newTag}
                            onChange={handleChangeNewTag}
                            clearButton
                            onClearButtonClick={handleClearNewTag}
                            connectedRight={<Button primary={true} onClick={handleAdd}>Add</Button>}
                        />
                    </FormLayout>
                </Layout.Section>
                <Layout.Section>
                    {(tags.length > 0) && <React.Fragment>
                        <Stack>
                            {tags.map((tag) => {
                                return (
                                    <Stack.Item>
                                        <Tag key={tag} onRemove={removeTag(tag)}>{tag}</Tag>
                                    </Stack.Item>
                                )
                            })}
                        </Stack>
                    </React.Fragment>}
                </Layout.Section>
            </Layout>
        </React.Fragment>
    )
}

export default ApplyTags