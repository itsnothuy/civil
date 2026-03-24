# ── Production Dockerfile — Civil BIM Viewer ────────────────────────────────
# Multi-stage build: Node.js build → nginx static serve
#
# Build:   docker build -t civil-bim-viewer .
# Run:     docker run -p 8080:80 civil-bim-viewer
# Compose: see docker-compose.yml

# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy source and build
COPY tsconfig.json vite.config.ts ./
COPY src/ src/
RUN npm run build

# ── Stage 2: Production ────────────────────────────────────────────────────
FROM nginx:1.27-alpine

# Security: remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Custom nginx config with security headers
COPY docker/nginx.conf /etc/nginx/conf.d/civil-bim-viewer.conf

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Security: run as non-root
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:80/ || exit 1

# Labels (OCI standard)
LABEL org.opencontainers.image.title="Civil BIM Viewer" \
      org.opencontainers.image.description="Open-source browser-based BIM/IFC viewer" \
      org.opencontainers.image.source="https://github.com/itsnothuy/civil" \
      org.opencontainers.image.licenses="AGPL-3.0-or-later"

CMD ["nginx", "-g", "daemon off;"]
