import React, {useEffect} from 'react'
import API_ROUTES from '@/app/consts/api'
import {useRouter} from 'next/router'
import useShop from '@/app/providers/ShopProvider'

const Install: React.FC = (): JSX.Element => {

    const router = useRouter()

    const {shop} = useShop()

    useEffect(() => {
        if (shop && router.query.code) {
            fetch(API_ROUTES.INSTALL, {
                method: 'POST',
                body: JSON.stringify({
                    storeId: shop,
                    code: router.query.code
                })
            }).then((response) => {
                return response.json()
            }).then((data) => {
                if (data.success) {
                    if (window.parent) {
                        window.parent.location.href = data.redirect
                    } else {
                        window.location.href = data.redirect
                    }
                } else {
                    // @todo show error
                    console.error('Install failed', data.message)
                }
            }).catch((error) => {
                console.error(error)
            })
        }
    }, [router])

    return (
        <React.Fragment>
            Installing... @todo
        </React.Fragment>
    )
}

export default Install