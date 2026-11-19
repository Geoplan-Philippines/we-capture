# syntax=docker/dockerfile:1

# ---- build ----
FROM node:24-alpine AS build
RUN npm install -g pnpm@12.21.0 --no-fund --no-audit
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Dependencies first so they cache between code changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# ---- runtime ----
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    LEADS_CSV_PATH=/data/leads.csv

# /data holds the leads CSV. Mount a volume here so it survives restarts.
RUN mkdir -p /data && chown node:node /data

# Next.js standalone output: a self-contained server plus the static assets it serves.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

USER node
VOLUME ["/data"]
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"

CMD ["node", "server.js"]
