import {Button, Card, ExceptionList, FormLayout, Layout, TextField, TextStyle} from '@shopify/polaris'
import React, {useCallback, useState} from 'react'
import useApi, {IApiError} from "@/app/hooks/useApi";

const TestPostcode: React.FC = (): JSX.Element => {

    const [isTesting, setIsTesting] = useState<boolean>(false)
    const [postcode, setPostcode] = useState<string>(null)
    const [error, setError] = useState<string>(null)
    const [result, setResult] = useState<any>(null) // @todo type this...

    const Api = useApi()

    const handleChange = useCallback((value) => {
        setError(null)
        setPostcode(value)
    }, [])

    const handleTest = () => {
        setResult(null)
        setError(null)
        setIsTesting(true)

        Api.testPostcode(postcode).then((result) => {
            setResult(result)
        }).catch((error: IApiError) => {
            setError(error.message)
        }).finally(() => {
            setIsTesting(false)
        })
    }

    return (
        <React.Fragment>
            <Layout>
                <Layout.Section>
                    <FormLayout>
                        <TextField
                            id={'postcode'}
                            label={'Postcode'}
                            onChange={handleChange}
                            value={postcode}
                            helpText={'Enter postcode'}
                            error={error}
                        />
                        <Button loading={isTesting} primary onClick={handleTest}>Test</Button>
                        {result && <React.Fragment>
                            <Card title={'Test Result'}>
                                <Card.Section subdued={true}>
                                    <TextStyle variation={'strong'}>Postcode</TextStyle>
                                </Card.Section>
                                <Card.Section>
                                    <ExceptionList
                                        items={[
                                            {
                                                title: 'Tested',
                                                description: result.originalPostcode,
                                            },
                                            {
                                                title: 'Outcode',
                                                description: result.parsedPostcode.outcode,
                                            },
                                            {
                                                title: 'Area',
                                                description: result.parsedPostcode.area,
                                            },
                                        ]}
                                    />
                                </Card.Section>
                                <Card.Section subdued={true}>
                                    <TextStyle variation={'strong'}>Matched Region</TextStyle>
                                </Card.Section>
                                <Card.Section>
                                    {!result.matchedRegion && <React.Fragment>
                                        <TextStyle variation='negative'>
                                            <TextStyle variation={'strong'}>
                                                Failed to associated any region to this postcode
                                            </TextStyle>
                                        </TextStyle>
                                    </React.Fragment>}
                                    {result.matchedRegion && <React.Fragment>
                                        <ExceptionList
                                            items={[
                                                {
                                                    title: 'ID',
                                                    description: result.matchedRegion._id,
                                                },
                                                {
                                                    title: 'Name',
                                                    description: result.matchedRegion.name,
                                                },
                                                {
                                                    title: 'Outcode Filter(s)',
                                                    description: result.matchedRegion.outcode_filters.join(', '),
                                                },
                                                {
                                                    title: 'Area Filter(s)',
                                                    description: result.matchedRegion.area_filters.join(', '),
                                                },
                                            ]}
                                        />
                                    </React.Fragment>}
                                </Card.Section>
                            </Card>
                        </React.Fragment>}
                    </FormLayout>
                </Layout.Section>
            </Layout>
        </React.Fragment>
    )
}

export default TestPostcode