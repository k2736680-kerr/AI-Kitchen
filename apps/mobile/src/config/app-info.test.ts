import { describe, expect, it } from 'vitest';

import { resolveAppVersion, supportedLanguageNames } from './app-version';

describe('app-info', () => {
  it('prefers the expo config version when available', () => {
    expect(resolveAppVersion('2.3.4')).toBe('2.3.4');
  });

  it('falls back to package metadata when expo config is unavailable', () => {
    expect(resolveAppVersion(undefined)).toBe('1.0.0');
  });

  it('keeps the supported language names stable', () => {
    expect(supportedLanguageNames.join(' / ')).toBe('简体中文 / English');
  });
});
