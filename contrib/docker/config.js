exports._ = {
  // This is the port that your webserver's reverse proxy will forward requests to
  port: 9123,
};

if (!process.env.XMPP_DOMAIN) {
    throw new Error('Missing XMPP domain')
}
if (!process.env.XMPP_HOST) {
    throw new Error('Missing XMPP host')
}
if (!process.env.CHANNEL_COMPONENT) {
    throw new Error('Missing channel server component')
}

// Production settings
exports.production = {
  debug: process.env.DEBUG || false,
  xmppDomain: process.env.XMPP_DOMAIN,
  xmppHost: process.env.XMPP_HOST,
  xmppAnonymousDomain: process.env.ANONYMOUS_COMPONENT,
  channelDomain: process.env.CHANNEL_COMPONENT,
  pusherComponent: process.env.PUSHER_COMPONENT,
  friendFinderComponent: process.env.FRIENDFINDER_COMPONENT,
  searchComponent: process.env.SEARCH_COMPONENT,
  homeMediaRoot: process.env.MEDIA_ENDPOINT,
  createUserOnSessionCreation: true,
  disableWebsocket: (typeof process.env.DISABLE_WEBSOCKET !== 'undefined') ? process.env.DISABLE_WEBSOCKET : false
}