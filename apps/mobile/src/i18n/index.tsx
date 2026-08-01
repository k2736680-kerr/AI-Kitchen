import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next, I18nextProvider } from 'react-i18next';
import { useEffect, useState, type PropsWithChildren } from 'react';
import { resources } from './resources';

/* i18next intentionally exposes a default instance with these methods. */
/* eslint-disable import/no-named-as-default-member */

export type AppLanguage = 'zh-CN' | 'en-US';
const languageStorageKey = 'ai-kitchen.language';
function preferredLanguage(): AppLanguage { return getLocales()[0]?.languageCode === 'en' ? 'en-US' : 'zh-CN'; }

void i18n.use(initReactI18next).init({ resources, lng: preferredLanguage(), fallbackLng: 'zh-CN', interpolation: { escapeValue: false }, compatibilityJSON: 'v4' });

export function I18nProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  useEffect(() => { void AsyncStorage.getItem(languageStorageKey).then((language) => { if (language === 'zh-CN' || language === 'en-US') return i18n.changeLanguage(language); return undefined; }).catch((error: unknown) => { console.warn('[i18n] Failed to read saved language; using the device language.', error); }).finally(() => setReady(true)); }, []);
  if (!ready) return null;
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
export async function setAppLanguage(language: AppLanguage): Promise<void> { await i18n.changeLanguage(language); await AsyncStorage.setItem(languageStorageKey, language); }
export function currentAppLanguage(): AppLanguage { return i18n.language === 'en-US' ? 'en-US' : 'zh-CN'; }
export { i18n };
