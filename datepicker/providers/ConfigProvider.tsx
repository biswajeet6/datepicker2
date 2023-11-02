import React, {createContext, useContext, useEffect, useState} from 'react'
import {IConfig} from '@/app/types/store'
import {useQuery} from 'react-query'
import useApi from '@/app/hooks/useApi'

export const ConfigContext: React.Context<{
    config: IConfig
}> = createContext(null)

export const ConfigProvider = ({children}) => {

    const [config, setConfig] = useState<IConfig>(null)

    const api = useApi()

    const query = useQuery(['configuration'], api.store.getConfig)

    useEffect(() => {
        if (query.data && !config) {
            setConfig(query.data)
        }
    }, [query])

    return (
        <ConfigContext.Provider value={{
            config: config
        }}>
            {children}
        </ConfigContext.Provider>
    )
}

const useConfig = () => useContext(ConfigContext)

export default useConfig