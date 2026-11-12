FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Vite bakes VITE_* vars into the build at compile time, so this has to be a
# build arg rather than a container env var read at runtime.
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine
# Picks up OS package security fixes released after this base image tag was
# last built, rather than waiting on an upstream rebuild.
USER root
RUN apk update && apk upgrade --no-cache && rm -rf /var/cache/apk/*
USER nginx
COPY --chown=nginx:nginx --from=build /app/dist /usr/share/nginx/html
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
