import React from 'react'
import Stage from '@/app/components/common/Stage'
import {Button, Card, Heading, Page, Stack} from '@shopify/polaris'
import useShop from '@/app/providers/ShopProvider'

/**
 * @todo add an alert here if a region has no associated shipping method (add this to regions list too)
 *
 * @constructor
 */
const Dashboard: React.FC = (): JSX.Element => {

    const {shop} = useShop()

    // @todo [public] handle this properly
    const setupComplete = true

    return (
        <Stage>
            {setupComplete && <React.Fragment>
                <Page title={'Dashboard'}>
                    <Card>
                        <Card.Section>
                            <Stack alignment={'center'}>
                                <Stack.Item fill>
                                    <Stack vertical={true} spacing={'tight'}>
                                        <Stack.Item>
                                            <Heading>Manage configuration</Heading>
                                        </Stack.Item>
                                    </Stack>
                                </Stack.Item>
                                <Stack.Item>
                                    <Button url={'/configuration'}>Manage</Button>
                                </Stack.Item>
                            </Stack>
                        </Card.Section>
                        <Card.Section>
                            <Stack alignment={'center'}>
                                <Stack.Item fill>
                                    <Stack vertical={true} spacing={'tight'}>
                                        <Stack.Item>
                                            <Heading>Manage rules</Heading>
                                        </Stack.Item>
                                    </Stack>
                                </Stack.Item>
                                <Stack.Item>
                                    <Button url={'/rules'}>Manage</Button>
                                </Stack.Item>
                            </Stack>
                        </Card.Section>
                        <Card.Section>
                            <Stack alignment={'center'}>
                                <Stack.Item fill>
                                    <Stack vertical={true} spacing={'tight'}>
                                        <Stack.Item>
                                            <Heading>Manage regions</Heading>
                                        </Stack.Item>
                                    </Stack>
                                </Stack.Item>
                                <Stack.Item>
                                    <Button url={'/regions'}>Manage</Button>
                                </Stack.Item>
                            </Stack>
                        </Card.Section>
                        <Card.Section>
                            <Stack alignment={'center'}>
                                <Stack.Item fill>
                                    <Stack vertical={true} spacing={'tight'}>
                                        <Stack.Item>
                                            <Heading>Manage shipping methods</Heading>
                                        </Stack.Item>
                                    </Stack>
                                </Stack.Item>
                                <Stack.Item>
                                    <Button url={'/shippingMethods'}>Manage</Button>
                                </Stack.Item>
                            </Stack>
                        </Card.Section>
                    </Card>
                </Page>
            </React.Fragment>}
        </Stage>
    )
}

export default Dashboard