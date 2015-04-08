################################################################################
# Build a dockerfile for buddycloud-http-api
# Based on ubuntu
################################################################################

FROM dockerfile/nodejs

MAINTAINER Lloyd Watkin <lloyd@evilprofessor.co.uk>

EXPOSE 9123

RUN apt-get update
RUN apt-get upgrade -y
RUN apt-get install -y --no-install-recommends git git-core libicu-dev libexpat-dev build-essential libssl-dev build-essential g++

RUN git clone https://github.com/buddycloud/buddycloud-http-api.git api-server
RUN cd api-server && git checkout master
RUN cd api-server && npm i . && cp contrib/docker/config.js .
ADD contrib/docker/start.sh /data/

RUN chmod +x start.sh
CMD ./start.sh
