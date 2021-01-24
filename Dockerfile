FROM node:10-alpine

ENV NODE_ENV=producion


WORKDIR /app

COPY package*.json ./

RUN npm install 

COPY . .


CMD ["npm","start"]


