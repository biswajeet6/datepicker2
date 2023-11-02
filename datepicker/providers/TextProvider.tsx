import React, {createContext} from 'react'
import translations from '../public/locales/en.json'

export const locale = 'en'

export const TextContext: React.Context<any> = createContext({})

/**
 * Text provider
 *
 * @param children
 * @param locale
 * @constructor
 */
export const TextProvider = ({children}) => {
    const translation = getTranslations()

    return (
        <TextContext.Provider value={{translation, locale}}>
            {children}
        </TextContext.Provider>
    )
}

export const getTranslations = () => {
    return translations
}

export const _T = (key: string, replacements: any = null) => {

    if (typeof key !== 'string') {
        console.error('Invalid text key type (use string) with dot notation')
        return '[error]'
    }

    const dots = key.split('.')
    const dictionary = getTranslations()
    let text = dots.reduce((xs, x) => (xs && xs[x]) ? xs[x] : false, dictionary)

    if (!text) {
        return `[${key} not found]`
    }

    if (replacements) {
        Object.keys(replacements).forEach(key => {
            const r = `{{${key}}}`
            if (text.includes(r)) {
                text = text.replace(r, replacements[key])
            }
        })
    }

    return text
}

export default TextProvider