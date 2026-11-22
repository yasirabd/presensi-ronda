FROM node:24-bookworm-slim AS web
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Existing Render services already provide the NEXT_PUBLIC_* build arguments.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG EXPO_PUBLIC_SUPABASE_URL
ARG EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG EXPO_PUBLIC_WEB_URL
RUN EXPO_PUBLIC_SUPABASE_URL="${EXPO_PUBLIC_SUPABASE_URL:-$NEXT_PUBLIC_SUPABASE_URL}" \
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY="${EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}" \
    npm run build

FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3-venv curl ca-certificates libglib2.0-0 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY face ./face
RUN sh face/setup.sh && chmod -R a+rX face
COPY --from=web /app/node_modules/@supabase ./node_modules/@supabase
COPY --from=web /app/node_modules/tslib ./node_modules/tslib
COPY --from=web /app/node_modules/iceberg-js ./node_modules/iceberg-js
COPY --from=web --chown=node:node /app/dist ./dist
COPY --chown=node:node server ./server
ENV NODE_ENV=production
USER node
EXPOSE 3000
CMD ["node", "server/index.ts"]
