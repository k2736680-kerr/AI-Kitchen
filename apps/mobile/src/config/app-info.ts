import Constants from 'expo-constants';

import { resolveAppVersion, supportedLanguageNames } from './app-version';

export function getAppVersion(): string {
  return resolveAppVersion(Constants.expoConfig?.version);
}

export { supportedLanguageNames };
