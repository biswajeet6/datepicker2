import React from 'react'
import {Badge, Banner, Button, Card, Heading, Icon, Page, Stack, TextStyle} from '@shopify/polaris'
import {CircleCancelMajor, CircleTickMajor} from '@shopify/polaris-icons'

const Setup: React.FC = (): JSX.Element => {
    return (
        <React.Fragment>
            <Page
                title={'Custom Shipping Dates Setup'}
            >
                <Card
                    title={'Getting Started'}
                    actions={[
                        {
                            content: 'Ask a question',
                            url: '/support/@todo',
                        },
                        {
                            content: 'Read the installation guide',
                            url: '/support/@todo',
                        },
                    ]}
                >

                    <Card.Section>
                        <Banner status={'info'}><TextStyle variation={'strong'}>Welcome!</TextStyle> Thanks for
                            installing Custom Shipping Dates. To get started, you'll need to complete our onboarding
                            process.</Banner>
                    </Card.Section>

                    <Card.Section>
                        <Stack alignment={'center'}>
                            <Stack.Item>
                                <Icon
                                    source={CircleTickMajor}
                                    color={'success'}
                                    backdrop={true}
                                />
                            </Stack.Item>
                            <Stack.Item fill>
                                <Stack vertical={true} spacing={'tight'}>
                                    <Stack.Item>
                                        <Heading>Connect your Shopify store</Heading>
                                        <TextStyle>You've successfully connected the app to your Shopify
                                            store</TextStyle>
                                    </Stack.Item>
                                </Stack>
                            </Stack.Item>
                            <Stack.Item>
                                <Badge status={'success'} progress={'complete'}>Complete</Badge>
                            </Stack.Item>
                        </Stack>
                    </Card.Section>

                    <Card.Section>
                        <Stack alignment={'center'}>
                            <Stack.Item>
                                <Icon
                                    source={CircleCancelMajor}
                                    color={'base'}
                                    backdrop={true}
                                />
                            </Stack.Item>
                            <Stack.Item fill>
                                <Stack vertical={true} spacing={'tight'}>
                                    <Stack.Item>
                                        <Heading>Setup your store configuration</Heading>
                                        <TextStyle>Configure the the default options which apply to all
                                            customers</TextStyle>
                                    </Stack.Item>
                                </Stack>
                            </Stack.Item>
                            <Stack.Item>
                                <Button url={'/configuration'}>Set up</Button>
                            </Stack.Item>
                        </Stack>
                    </Card.Section>
                </Card>
            </Page>
        </React.Fragment>
    )
}

export default Setup