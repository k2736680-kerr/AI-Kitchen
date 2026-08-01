# Mobile Design System and Internationalization

## Scope

The mobile client uses one light, food-focused visual system: warm background, white elevated surfaces, sage primary actions, coral error states and yellow caution states. This layer changes presentation only; generation requests, local/remote repositories, API contracts and recipe schemas remain unchanged.

## Tokens and components

- `src/constants/theme.ts` defines palette, spacing, radii, shadow, icon and motion tokens.
- `Screen`, `AppHeader`, `AppCard`/`SurfaceCard`, `AppButton`, `ThemedText` and `StatusMessage` are the shared screen primitives.
- Launch and onboarding visuals reuse the same palette and illustration direction: native splash + in-app launch transition use the brand splash mark, and first-run onboarding uses static local `require()` illustrations with localized copy layered outside the image assets.
- Ingredient, condition, recipe, history and cooking feature components use those primitives rather than maintaining page-level visual systems.

## Language behavior

- Supported UI languages are `zh-CN` and `en-US`.
- First launch follows the device language; unsupported languages use Simplified Chinese.
- The setting is saved locally using AsyncStorage and applies immediately through i18next/react-i18next.
- First-run onboarding completion is also stored locally with AsyncStorage. It is a device-local UX flag only: clearing app data resets it, and it is not synced to any backend identity.
- User-facing static copy is stored in `src/i18n/resources.ts`; generation IDs remain stable business values and are mapped to localized display text in the UI.
- The UI setting remains client-local and persists with AsyncStorage. For every new generation, Mobile explicitly snapshots the current `zh-CN` or `en-US` locale into `GenerationRequest v1`; it does not use device headers or server locale inference.

## Known product boundaries

- Dynamic recipe titles, ingredient names, model-produced descriptions, steps and safety notices are payload data, not translated client copy. `recipe.locale` is the content generation language: switching UI language changes only static UI, never an existing recipe body or its database record. Remote History and session recent recipes are filtered by the current locale to avoid mixed-language lists.
- Nutrition remains unavailable and is intentionally not rendered as a product section.
- Recipe safety messages are contextual notices, not a claim of absolute food safety.
- Session cooking progress and local language preference have different persistence boundaries: language persists locally; cooking progress remains session-only.
- The bottom tabs now include `Home`, `Explore`, `History` and `Profile`. `Profile` is a guest-only product surface in P0/P1: it must not create fake login fields, mock users or successful sign-in states.
- `Profile` reuses the existing Settings route for language changes. Supported language names remain `简体中文 / English`, and tab/page copy updates immediately after switching.
- `/legal/terms` and `/legal/privacy` are placeholder structure pages only. They explicitly warn that formal legal text and effective dates must be added before any official release.
- `/about` reads the app version from app configuration/package metadata through a shared helper so multiple pages do not diverge on version display.
