exports._ = {
  // This is the port that your webserver's reverse proxy will forward requests to
  port: 9123,
};

// Production settings
exports.production = {
  // More logs?
  debug: process.env('DEBUG') || false,

  // the domain your run buddycloud for (if your username is name@EXAMPLE.COM then this would be EXAMPLE.COM)
  xmppDomain: process.env('XMPP_DOMAIN') || throw new Error('Missing XMPP domain'),

  // the host where your XMPP server is running
  xmppHost: process.env('XMPP_HOST') || throw new Error('Missing XMPP host'),
 
  // the anonymous domain that unauthenticated users are dropped into (should match your XMPP server)
  xmppAnonymousDomain: process.env('ANONYMOUS_COMPONENT'),

  // your buddycloud channel server
  channelDomain: process.env('CHANNEL_COMPONENT') || throw new Error('Missing channel server component'),

  // the pusher component sends emails to users (https://github.com/buddycloud/buddycloud-pusher)
  pusherComponent: process.env('PUSHER_COMPONENT'),

  // the friend finder component looks for your friends from other social networks
  friendFinderComponent: process.env('FRIENDFINDER_COMPONENT'),

  // you probably want to use the buddycloud search service
  searchComponent: process.env('SEARCH_COMPONENT'),

  // where to forward media requests
  homeMediaRoot: process.env('MEDIA_ENDPOINT'),

  createUserOnSessionCreation: true,
    
  disableWebsocket: (typeof process.env('DISABLE_WEBSOCKET') !== 'undefined') ? process.env('DISABLE_WEBSOCKET') || false
}