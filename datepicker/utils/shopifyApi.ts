import SHOPIFY from '@/app/consts/shopify'

const ShopifyApi = (shop, token = null) => {

    const getAccessToken = async (client_id, client_secret, code) => {
        try {
            const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
                headers: {
                    'Content-Type': 'application/json'
                },
                method: 'POST',
                body: JSON.stringify({
                    client_id: client_id,
                    client_secret: client_secret,
                    code
                })
            }).then((response) => {
                return response.json()
            })

            return response.access_token ?? false
        } catch (e) {
            console.error(e)
            return false
        }
    }

    const getCarrierService = async (carrierServiceId) => {
        try {
            const response = await fetch(`https://${shop}/admin/api/${SHOPIFY.API_VERSION}/carrier_services/${carrierServiceId}.json`, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Shopify-Access-Token': token
                },
                method: 'GET'
            }).then((response) => {
                return response.json()
            })

            return response ?? false
        } catch (e) {
            console.error(e)
            return false
        }
    }

    const createCarrierService = async (carrierService: {
        name: string,
        callback_url: string,
        service_discovery: boolean
    }) => {
        try {
            const response = await fetch(`https://${shop}/admin/api/${SHOPIFY.API_VERSION}/carrier_services.json`, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Shopify-Access-Token': token
                },
                method: 'POST',
                body: JSON.stringify({
                    carrier_service: carrierService
                })
            }).then((response) => {
                return response.json()
            })

            return response ?? false
        } catch (e) {
            console.error(e)
            return false
        }
    }

    const deleteCarrierService = async (carrierServiceId: string) => {
        try {
            const response = await fetch(`https://${shop}/admin/api/${SHOPIFY.API_VERSION}/carrier_services/${carrierServiceId}.json`, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Shopify-Access-Token': token
                },
                method: 'DELETE',
            }).then((response) => {
                return response.json()
            })

            return response ?? false
        } catch (e) {
            console.error(e)
            return false
        }
    }

    const updateOrderNoteAttributes = async (orderId: string, noteAttributes: { name: string, value: string }[]) => {
        try {
            const response = await fetch(`https://${shop}/admin/api/${SHOPIFY.API_VERSION}/orders/${orderId}.json`, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Shopify-Access-Token': token
                },
                method: 'PUT',
                body: JSON.stringify({
                    order: {
                        id: orderId,
                        note_attributes: noteAttributes
                    }
                })
            }).then((response) => {
                return response.json()
            })

            return response ?? false
        } catch (e) {
            console.error(e)
            return false
        }
    }

    return {
        getAccessToken,
        createCarrierService,
        deleteCarrierService,
        getCarrierService,
        updateOrderNoteAttributes,
    }
}

export default ShopifyApi