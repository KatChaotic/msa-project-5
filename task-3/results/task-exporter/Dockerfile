FROM node:20-alpine

WORKDIR /opt/app

COPY package*.json yarn.lock ./

RUN yarn install --production

COPY . .

CMD ["node", "index.mjs"]