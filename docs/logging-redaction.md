# Logging redaction policy (P1-5)

## Rules

1. Application code under `src/` must use `safeLogError` / `safeLogWarn` from `src/lib/safeLog.ts` — never raw `console.*` (enforced by `pnpm run check:log-redaction`).
2. `src/test/setup.ts` may mock `console.error` for Vitest; `safeLog.ts` is the only module that calls `console` directly.
3. Redaction covers API-key-shaped strings (`AIza…`, `sk-…`, `sk-ant-…`, `Bearer …`) and object keys matching `apiKey`, `token`, `secret`, `password`, `authorization`, `encrypted`.
4. User-facing errors continue to use `AppError.toUserMessage()` / i18n — logs are for developers only and must not echo vault material.

## CI

`check:log-redaction` runs in the Deploy workflow after unit tests (no coverage artifact required).

## Raising coverage

When adding new catch blocks, pass a static scope string plus the error object:

```ts
safeLogError('Failed to persist settings', err);
```
