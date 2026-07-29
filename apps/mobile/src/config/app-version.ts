import packageJson from '../../package.json';

export const supportedLanguageNames = ['简体中文', 'English'] as const;

export function resolveAppVersion(expoVersion: string | null | undefined): string {
  return expoVersion ?? packageJson.version;
}
