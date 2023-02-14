# Fix --platform for M1; remove for other configurations
FROM --platform=linux/arm64 kevinluvian/headfull-chromium:latest

RUN mkdir /app
WORKDIR /app

COPY ./package.json ./package.json
COPY ./package-lock.json ./package-lock.json

RUN npm install 
RUN npx playwright install 

COPY . .

ENV NODE_EXEC "node index.js"
ENV APP_PATH=/app

CMD ["run"]
ENTRYPOINT [ "/entrypoint.sh" ]
