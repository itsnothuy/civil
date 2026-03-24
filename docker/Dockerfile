# ── Build stage: install ifcConvert ──────────────────────────
FROM ubuntu:22.04 AS builder

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      wget ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Download IfcConvert (IfcOpenShell) — pinned version for reproducibility
ARG IFCCONVERT_VERSION=0.7.0
ARG IFCCONVERT_URL=https://github.com/IfcOpenShell/IfcOpenShell/releases/download/ifcopenshell-python-${IFCCONVERT_VERSION}/ifcconvert-${IFCCONVERT_VERSION}-linux64.zip

# In production, replace the placeholder URL above with the
# actual release asset URL for the target architecture.

# ── Runtime stage ───────────────────────────────────────────
FROM ubuntu:22.04

# Security: run as non-root
RUN groupadd -r converter && useradd -r -g converter converter

# Minimal runtime dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      libgomp1 \
      && rm -rf /var/lib/apt/lists/*

# Working directories
WORKDIR /app
RUN mkdir -p /app/uploads /app/output && \
    chown -R converter:converter /app

# Copy ifcConvert binary (placeholder — replace with actual binary path)
# COPY --from=builder /usr/local/bin/ifcconvert /usr/local/bin/ifcconvert

# Switch to non-root user
USER converter

# Default command: idle (override with docker run / compose)
CMD ["echo", "ifcConvert container ready. Mount volumes and run: ifcconvert input.ifc output.xkt"]

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD test -d /app/uploads || exit 1

# Labels
LABEL maintainer="civil-bim-viewer" \
      description="IFC conversion container using IfcConvert" \
      version="1.0.0"
