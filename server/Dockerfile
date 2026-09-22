FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
# Picks up OS package security fixes released after this base image tag was
# last built (e.g. OpenSSL), rather than waiting on an upstream rebuild.
RUN apk update && apk upgrade --no-cache && rm -rf /var/cache/apk/*
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

# The container only ever runs `node src/server.js` - it never invokes the
# npm CLI. Removing it drops the vulnerability surface of its own bundled
# dependencies (tar, sigstore, etc.) along with it, rather than carrying
# code nothing here uses.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

USER node
EXPOSE 4000
CMD ["node", "src/server.js"]
