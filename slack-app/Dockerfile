# Railway (or any Docker host) image for the Slack service. Build context is the repo ROOT,
# because the service reuses the card logic and seed data in ../src.
FROM node:22-slim
WORKDIR /app
# Root package.json only marks ../src as ES modules; its frontend dependencies are not installed.
COPY package.json ./
COPY src/logic ./src/logic
COPY src/data ./src/data
COPY slack-app/package.json slack-app/package-lock.json ./slack-app/
RUN cd slack-app && npm ci --omit=dev --no-audit --no-fund
COPY slack-app/src ./slack-app/src
ENV NODE_ENV=production
# The Ansel sync API (on when SYNC_SECRET is set) listens on Railway's $PORT on all interfaces.
ENV API_HOST=0.0.0.0
USER node
WORKDIR /app/slack-app
CMD ["node", "src/index.js"]
