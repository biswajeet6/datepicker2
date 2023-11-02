import {useEffect, useState} from "react"
import qs from 'query-string'

const getEnv = () => {

    const [domain, setDomain] = useState<string>(null)
    const [apiKey, setApiKey] = useState<string>(null)

    useEffect(() => {
        if (typeof window !== 'undefined' && window.location && !domain) {
            const query = qs.parse(window.location.search)

            if (query.shop) {
                setDomain(query.shop.toString())

                // attempt to retrieve the apiKey for shop from env
                const apiKey = process.env.SHOPIFY_API_KEY

                if (!apiKey) throw `apiKey missing for domain: ${query.shop.toString()}`
                else setApiKey(apiKey)
            }
        }
    }, [domain, apiKey])

    return [
        domain,
        apiKey
    ]
}

export default getEnv