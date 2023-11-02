import React, {createContext, useContext} from 'react'

export const ShopContext: React.Context<any> = createContext({})

export const ShopProvider = ({shop, children}) => {
    return (
        <ShopContext.Provider value={{shop}}>
            {children}
        </ShopContext.Provider>
    )
}

const useShop = () => useContext(ShopContext)

export default useShop