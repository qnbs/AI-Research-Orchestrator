#!/usr/bin/env bash
# ==============================================================================
# AI Research Orchestrator — DevContainer postCreateCommand
# Runs once after the container is created.
# ==============================================================================
set -euo pipefail
IFS=$'\n\t'

REPO_DIR="/workspaces/AI-Research-Orchestrator"
LOG_PREFIX="[postCreate]"

log()  { echo "$LOG_PREFIX $*"; }
warn() { echo "$LOG_PREFIX ⚠️  $*" >&2; }
ok()   { echo "$LOG_PREFIX ✅ $*"; }

# ── 1. Trust the workspace (Git safe.directory) ───────────────────────────────
log "Marking workspace as trusted Git directory..."
git config --global --add safe.directory "$REPO_DIR" 2>/dev/null || true
ok "Git safe.directory configured"

# ── 2. Install npm dependencies (ci = reproducible, lock-file based) ─────────
log "Installing npm dependencies via npm ci..."
cd "$REPO_DIR"
npm ci --prefer-offline 2>&1 | tail -5
ok "npm dependencies installed"

# ── 3. Install Playwright Chromium browser ────────────────────────────────────
log "Installing Playwright Chromium browser..."
# Use the project-local playwright version for consistency
if npx playwright install chromium 2>&1 | tail -5; then
  ok "Playwright Chromium installed"
else
  warn "Playwright install failed — browser integration tests will be skipped"
fi

# ── 4. TypeScript type check ──────────────────────────────────────────────────
log "Running TypeScript type check..."
if npm run typecheck 2>&1 | grep -E "error TS|Found [^0]" | head -20; then
  warn "TypeScript errors found (see above) — continuing setup"
else
  ok "TypeScript check passed"
fi

# ── 5. Unit tests ────────────────────────────────────────────────────────────
log "Running unit tests..."
if npm run test:run 2>&1 | tail -15; then
  ok "Tests completed"
else
  warn "Some tests failed — check output above"
fi

# ── 6. Gemini API key security check ─────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════"
echo "  AI Research Orchestrator — DevContainer Ready 🚀"
echo "════════════════════════════════════════════════════"

# Check for accidentally committed secrets
if git log --oneline -10 2>/dev/null | head -1 | grep -q "^"; then
  if git grep -rn --cached "AIza[0-9A-Za-z_-]\{35\}" 2>/dev/null | head -1 | grep -q .; then
    warn "SECURITY: Possible Google API key detected in tracked files!"
    warn "Run: git rm --cached <file> && echo '*.env' >> .gitignore"
  fi
fi

# Validate .env is not tracked
if git ls-files --error-unmatch .env 2>/dev/null; then
  warn "SECURITY: .env file is tracked by Git! Remove it with: git rm --cached .env"
fi

# Report Gemini key availability
if [ -n "${GEMINI_API_KEY:-}" ]; then
  KEY_PREVIEW="${GEMINI_API_KEY:0:8}..."
  ok "GEMINI_API_KEY is set via Codespaces secret ($KEY_PREVIEW)"
  echo ""
  echo "  The app will automatically use the key from the environment."
  echo "  You can also update it anytime in the app's Settings page."
else
  echo ""
  echo "  ⚠️  GEMINI_API_KEY is NOT set."
  echo ""
  echo "  To enable AI features, set a Codespaces secret:"
  echo "    1. Go to: https://github.com/settings/codespaces"
  echo "    2. Add secret: GEMINI_API_KEY = your key from https://aistudio.google.com"
  echo "    3. Authorize it for the qnbs/AI-Research-Orchestrator repo"
  echo "    4. Rebuild this devcontainer (Ctrl+Shift+P → Rebuild Container)"
  echo ""
  echo "  Alternatively, enter the key directly in the app's Settings page."
fi

echo ""
echo "  Start dev server: npm run dev"
echo "  Run tests:        npm run test"
echo "  Type check:       npm run typecheck"
echo "  Build:            npm run build"
echo ""
echo "════════════════════════════════════════════════════"
