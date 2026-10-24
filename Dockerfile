FROM node:20-alpine
WORKDIR /app
COPY . .
EXPOSE 3030
CMD ["node", "server.js"]
