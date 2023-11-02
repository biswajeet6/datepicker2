import API_ROUTES from '@/app/consts/api'
import qs from 'query-string'
import React, {useEffect} from 'react'
import LoadingBar from '@/app/components/common/LoadingBar'

const Index: React.FC = (): JSX.Element => {
    const authenticate = async () => {

        const request = {
            method: 'POST',
            body: JSON.stringify({
                query: qs.parse(window.location.search)
            })
        }

        const response = await fetch(API_ROUTES.AUTH, request).then(res => res.json())

        if (response.redirect) {
            if (window.parent) {
                window.parent.location.href = response.redirect
            } else {
                window.location.href = response.redirect
            }
        }
    }

    useEffect(() => {
        if (typeof window !== 'undefined' && window.location) {
            if (fetch) {
                authenticate().catch((error) => {
                    throw error
                })
            }
        }
    }, [])

    return (
        <React.Fragment>
            <LoadingBar/>
        </React.Fragment>
    )
}

export default Index