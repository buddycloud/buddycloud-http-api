Implements https://buddycloud.org/wiki/Buddycloud_HTTP_API


## Build status

Build status of master branch

[![Build Status](https://travis-ci.org/buddycloud/buddycloud-http-api.svg?branch=master)](https://travis-ci.org/buddycloud/buddycloud-http-api)

Build status of the develop branch

[![Build Status](https://travis-ci.org/buddycloud/buddycloud-http-api.svg?branch=develop)](https://travis-ci.org/buddycloud/buddycloud-http-api)

## Install

Install documentation is at https://buddycloud.org/wiki/Install

## Realtime connection

A websocket (using the [xmpp-ftw](https://xmpp-ftw.jit.su) interface can be found at __$server/scripts/buddycloud.js__. This exposes a global object called *Buddycloud* 
which you can instantiate to give you a websocket connection.

Please see [buddycloud.com](http://www.buddycloud.com) for more information on using this connection.

## Docker

There is a docker image available for the API server. Configuration is currently passed via environment variables:

|      Configuration     	|          Example         	|                                             Description                                             	| Required or default 	|
|:----------------------:	|:------------------------:	|:---------------------------------------------------------------------------------------------------:	|:-------------------:	|
| XMPP_DOMAIN            	| buddycloud.org           	| The XMPP domain for your server                                                                     	| ✓                   	|
| XMPP_HOST              	| 192.168.0.55             	| The hostname or IP of your XMPP server                                                                        	| ✓                   	|
| CHANNEL_COMPONENT      	| channels.buddycloud.org  	| The channel server component address                                                                	| ✓                   	|
| ANONYMOUS_COMPONENT    	| anon.buddycloud.org      	| An 'anonymous' component which can be used for open nodes                                           	| null                	|
| MEDIA_ENDPOINT         	| http://192.168.0.56:9000 	| The endpoint for a [media server](https://github.com/buddycloud/buddycloud-media-server)            	| null                	|
| PUSHER_COMPONENT       	| pusher.buddycloud.org    	| The location of a [pusher component](https://github.com/buddycloud/buddycloud-pusher)               	| null                	|
| FRIENDFINDER_COMPONENT 	| finder.buddycloud.org    	| The location of a [friend finder component](https://github.com/buddycloud/buddycloud-friend-finder) 	| null                	|
| SEARCH_COMPONENT       	| search.buddycloud.org    	| The location of a [search component](https://github.com/buddycloud/channel-directory)               	| null                	|
| DISABLE_WEBSOCKET      	| 0                        	| Whether to disable the [XMPP-FTW](https://xmpp-ftw.jit.su) endpoint                                 	| false               	|
| DEBUG                  	| 1                        	| Whether to write additional debug to the logs                                                       	| false               	|

Then simply launch the API server with the required environment variables as follows:

```bash
docker run -d -p 9123:9123 -e ..... buddycloud/api-server
```

## Issues

Please log any issues at https://github.com/buddycloud/buddycloud-http-api/issues


## Developers

For developing please see the config file named config.js.developer-example.


## License and copyright

This code is Apache 2 licensed and copyright buddycloud.
