# DEPENDENCIES
# fabric-shim needs node ^18.0.0
FROM node:18.20.2-bullseye AS build

RUN --mount=type=cache,sharing=locked,target=/var/cache/apt \
  export DEBIAN_FRONTEND=noninteractive \
  && apt-get update \
  && apt-get install -y --no-install-recommends build-essential jq python3 libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev git

WORKDIR /usecase

# copy ./ to keep the directory structure as well. Using * would only copy over the files
COPY --chmod=0777 ./ .

RUN git config --global user.email "hello@settlemint.com" && \
  git config --global user.name "SettleMint" && \
  npm i --prefer-offline && \
  rm -Rf Dockerfile .dockerignore .github

USER root

FROM cgr.dev/chainguard/busybox:latest

COPY --from=build /usecase /usecase
