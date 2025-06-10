# docker/nuxt/nuxt.dockerfile
FROM node:20-alpine

WORKDIR /app

COPY ./nuxt-app/package*.json ./
RUN npm install

COPY ./nuxt-app .

RUN chmod +x node_modules/.bin/nuxt
