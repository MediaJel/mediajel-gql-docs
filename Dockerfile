# ---- Stage 1: Install dependencies ----
FROM node:18-alpine AS base

WORKDIR /rootDir

COPY package.json .
COPY yarn.lock .
COPY scripts/ scripts/
COPY src/ src/
COPY next.config.js .
COPY postcss.config.js .
COPY tailwind.config.ts .
ARG APP_ENV=prod
COPY entrypoint-dojo.sh .
COPY entrypoint-prod.sh .

RUN chmod +x entrypoint-dojo.sh entrypoint-prod.sh
RUN cp entrypoint-${APP_ENV}.sh entrypoint.sh
RUN yarn install --ignore-engines

# ---- Stage 2: Build the application ----
ARG AWS_ACCESS_KEY_ID
ARG AWS_SECRET_ACCESS_KEY
ARG AWS_DEFAULT_REGION=us-east-1
ENV AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
ENV AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
ENV AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION}

RUN yarn sync-schema:${APP_ENV}
RUN yarn build:${APP_ENV}

# RUN yarn global add serve
EXPOSE 3000

ENTRYPOINT [ "./entrypoint.sh" ]