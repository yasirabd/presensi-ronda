FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3-venv curl ca-certificates libglib2.0-0 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY face ./face
RUN sh face/setup.sh && chmod -R a+rX face
COPY --chown=node:node . .
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
RUN npm run build && npm prune --omit=dev && chown -R node:node .next node_modules face public
USER node
EXPOSE 3000
CMD ["npm","start"]
