FROM node:16.17.0-alpine3.15

WORKDIR /app

#RUN apk add --no-cache npm
COPY package.json ./
COPY blockDataRecorder.js ./
COPY .env ./

WORKDIR /app/externalFunctions
COPY externalFunctions/*.js ./

#WORKDIR /app/connections
#COPY connections/*.js ./

WORKDIR /app
RUN npm install --omit=dev && npm cache clean --force
CMD node --max-old-space-size=4096 --optimize_for_size --gc_interval=100 /app/blockDataRecorder.js
