import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { z } from 'zod'
import en from './locales/en.json'
import ms from './locales/ms.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ms: { translation: ms },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'ms'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'language',
      caches: ['localStorage'],
    },
  })

// Plain-words messages for the checks every form shares, used wherever a schema gives no message of
// its own. Anything else keeps zod's default text.
z.config({
  customError: (issue) => {
    if (issue.code === 'too_small' && issue.origin === 'string' && issue.minimum === 1) {
      return i18n.t('auth.validation.required')
    }
    if (issue.code === 'invalid_format' && issue.format === 'email') {
      return i18n.t('auth.validation.email')
    }
  },
})

export default i18n
