################################################################################
# Build a dockerfile for buddycloud-http-api
# Based on ubuntu
################################################################################

FROM dockerfile/nodejs

MAINTAINER Lloyd Watkin <lloyd@evilprofessor.co.uk>

EXPOSE 9123

ENV NODE_ENV production

RUN apt-get update
RUN apt-get upgrade -y
RUN apt-get install -y git git-core libicu-dev libexpat-dev build-essential libssl-dev build-essential g++

RUN git clone https://github.com/buddycloud/buddycloud-http-api.git api-server
RUN cd api-server && npm i .
RUN cd api-server && cp contrib/docker/config.js .
CMD cd api-server && npm start