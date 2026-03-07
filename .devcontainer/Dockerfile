# ==============================================================================
# AI Research Orchestrator — DevContainer
# Node 22 LTS + all tools preinstalled
# ==============================================================================
FROM node:22-bookworm-slim

# Metadata
LABEL maintainer="AI Research Orchestrator"
LABEL description="Full-stack React 19 + TypeScript + Tailwind dev environment"

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    wget \
    ca-certificates \
    gnupg \
    lsb-release \
    procps \
    jq \
    zip \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
    | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
    | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update && apt-get install -y gh \
    && rm -rf /var/lib/apt/lists/*

# Use non-root node user
USER node

# Set working directory
WORKDIR /workspaces/AI-Research-Orchestrator

# Configure npm for performance
RUN npm config set fund false && \
    npm config set audit-level moderate

# Expose dev server and preview ports
EXPOSE 3000 4173

# Default command
CMD ["bash"]
