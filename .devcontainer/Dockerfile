# ==============================================================================
# AI Research Orchestrator — DevContainer
# Node 22 LTS + Playwright Chromium + GitHub CLI + Security-hardened
# ==============================================================================
FROM node:22-bookworm-slim

LABEL org.opencontainers.image.title="AI Research Orchestrator DevContainer"
LABEL org.opencontainers.image.description="React 19 · TypeScript · Tailwind v4 · Framer Motion · RTK Query · Playwright"
LABEL org.opencontainers.image.licenses="MIT"

# ── System dependencies ────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Core utils
    git curl wget ca-certificates gnupg lsb-release \
    procps jq zip unzip xz-utils \
    # Playwright / Chromium runtime dependencies
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libdbus-1-3 libexpat1 libxcb1 \
    libxkbcommon0 libx11-6 libxcomposite1 libxdamage1 \
    libxext6 libxfixes3 libxrandr2 libgbm1 \
    libpango-1.0-0 libcairo2 libasound2 libxshmfence1 \
    libx11-xcb1 libxcursor1 libxi6 libxtst6 \
    fonts-liberation libfontconfig1 \
    # Required for Playwright --with-deps
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# ── GitHub CLI ─────────────────────────────────────────────────────────────────
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
    | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg 2>/dev/null \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] \
       https://cli.github.com/packages stable main" \
       | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update && apt-get install -y --no-install-recommends gh \
    && rm -rf /var/lib/apt/lists/*

# ── Switch to non-root node user ───────────────────────────────────────────────
USER node

WORKDIR /home/node

# ── npm hardening (as node user) ───────────────────────────────────────────────
RUN npm config set fund false \
    && npm config set audit-level moderate \
    && npm config set update-notifier false

# ── Pre-warm global Playwright CLI (no browsers yet — postCreate installs them) ─
# The actual browser download happens in postCreate.sh because it needs
# the project's package.json pinned Playwright version.
RUN npx --yes playwright@latest --version 2>/dev/null || true

# ── Port exposures ─────────────────────────────────────────────────────────────
# 3000 = Vite dev server  |  4173 = Vite preview
EXPOSE 3000 4173

CMD ["bash"]
