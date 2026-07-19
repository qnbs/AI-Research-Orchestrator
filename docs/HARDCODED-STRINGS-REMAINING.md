# Remaining Hardcoded Strings — Implementation Notes

## Overview

This document tracks hardcoded strings that still need extraction to the i18n system.

---

## ApiKeySettings.tsx — Remaining Hardcoded Strings

### Status Messages (Lines 210-220)

```tsx
<p className="font-semibold text-amber-500 mb-1">Security notice</p>
<p className="text-text-secondary">
  Your Gemini API key is <strong>encrypted</strong> and stored in this browser only. It
  is never sent to our servers. Requests go directly from your browser to the Google
  Gemini API.
</p>
<p className="text-text-secondary mt-2">
  <strong>Recommendation:</strong> Restrict the key in the{' '}
  <a href="https://aistudio.google.com/apikey" ...>Google AI Studio Console</a>
  for additional safety.
</p>
```

**Translation Keys Needed:**

- `apikey.security.title` — "Security notice"
- `apikey.security.text` — Main security paragraph
- `apikey.security.recommendation` — Recommendation text

### Status Display (Lines 222-235)

```tsx
<p className="font-medium text-text-primary">Gemini API key configured</p>
<p className="text-sm text-text-secondary">
  Your key is stored securely and ready for AI features.
</p>
```

**Translation Keys Needed:**

- `apikey.status.configured` — "Gemini API key configured"
- `apikey.status.ready` — "Your key is stored securely..."

```tsx
<p className="font-medium text-text-primary">No Gemini API key configured</p>
<p className="text-sm text-text-secondary">
  Enter your <a ...>Gemini API key</a> to enable AI research features.
</p>
```

**Translation Keys Needed:**

- `apikey.status.not_configured` — "No Gemini API key configured"
- `apikey.status.prompt` — "Enter your ... to enable AI research features"

### Button Text (Lines 240, 280)

```tsx
<button onClick={handleShowCurrentKey}>Reveal</button>
```

**Translation Key Needed:**

- `apikey.reveal` — Already added ✅

```tsx
{
  isNcbiSaving ? 'Saving...' : 'Save NCBI key';
}
```

**Translation Key Needed:**

- `apikey.ncbi.save` — "Save NCBI key"

### Instructions Section (Lines 340-360)

```tsx
<div className="text-sm text-text-secondary ...">
  <p><strong>How to get a Gemini API key:</strong></p>
  <ol className="list-decimal list-inside space-y-1 ml-2">
    <li>Open <a ...>Google AI Studio</a></li>
    <li>Sign in with your Google account</li>
    <li>Choose "Get API key" → "Create API key"</li>
    <li>Paste the key here and save</li>
  </ol>
  <p className="mt-3 text-xs text-text-secondary/70">
    Gemini API usage may incur costs. Monitor usage in Google Cloud / AI Studio.
  </p>
</div>
```

**Translation Keys Needed:**

- `apikey.instructions.title` — "How to get a Gemini API key:"
- `apikey.instructions.step1` — "Open Google AI Studio"
- `apikey.instructions.step2` — "Sign in with your Google account"
- `apikey.instructions.step3` — "Choose "Get API key" → "Create API key""
- `apikey.instructions.step4` — "Paste the key here and save"
- `apikey.instructions.cost_note` — Cost disclaimer

---

## HelpView.tsx — All Hardcoded Strings

### Guide Topics (Lines 120-200)

All guide topics are hardcoded in `useMemo`:

- "Understanding the Core Workflows"
- "Using the Orchestrator"
- "Using the Research Tab"
- "Using the Author Hub"
- "Using the Journal Hub"
- "Exporting Your Research"
- "Managing Your Knowledge Base"

### FAQ Items (Lines 200-250)

All FAQ items are hardcoded:

- "Do I need an API key?"
- "Is my data private?"
- "How does the AI work?"
- etc.

### Glossary Items (Lines 250-280)

All glossary terms are hardcoded:

- "Orchestrator"
- "Knowledge Base"
- "Author Hub"
- etc.

### About Section (Lines 80-100)

- "About AI Research Orchestration Author"
- "Core Principles" (Privacy First, AI as Assistant, Traceability)
- "Disclaimer"

---

## OnboardingView.tsx — All Hardcoded Strings

### Step Cards (Lines 30-50)

- "Define Your Topic" — "Enter any research query..."
- "Receive AI Analysis" — "The AI researches, filters..."
- "Leverage Your Knowledge" — "Build a personal, de-duplicated..."

### Welcome Text (Lines 55-65)

- "Welcome to the Future of Research"
- "Your intelligent assistant for scientific literature reviews."

---

## Implementation Priority

### High Priority (Blocking E2E Tests)

1. None — E2E test fixes are independent of i18n

### Medium Priority (User Experience)

1. ApiKeySettings status messages — User-facing feedback
2. ApiKeySettings instructions — Onboarding help

### Low Priority (Nice to Have)

1. HelpView content — Documentation
2. OnboardingView content — First-run experience

---

_Document created: 2026-07-18_
