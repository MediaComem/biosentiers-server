FROM node:6.10.3-alpine

LABEL maintainer "mei@heig-vd.ch"

ENV NODE_ENV="production" \
    PORT="3000" \
    S6_OVERLAY_VERSION="1.19.1.1"

# Install s6 overlay for service supervision (https://github.com/just-containers/s6-overlay)
RUN apk add --update --virtual .build-deps curl \
    && curl -sSLo /tmp/s6.tar.gz https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-amd64.tar.gz \
    && tar xzf /tmp/s6.tar.gz -C / \
    && rm -f /tmp/s6.tar.gz \
    && apk del .build-deps \
    && rm -rf /var/cache/apk/*

# Set up s6 configuration files
ADD docker /etc/

# Install tools
RUN apk add --update postgresql-client \
    && rm -rf /var/cache/apk/*

COPY package.json /usr/src/app/
WORKDIR /usr/src/app
RUN npm install \
    && npm cache clean \
    && rm -fr /tmp/*

COPY . /usr/src/app

# Set s6 as the entrypoint
ENTRYPOINT [ "/init" ]

EXPOSE 3000
