FROM node:20-alpine

WORKDIR /app
COPY . .

RUN npm install
RUN npx nuxi build

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
