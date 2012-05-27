// config.js:
// HTTP API server configuration. See README.md for details.

// Default settings (apply to all profiles)
exports._ = {
    port: 3000,
};

// Production settings (used by default)
exports.production = {
    xmppDomain: 'buddycloud.org',
    xmppAnonymousDomain: 'anon.buddycloud.org',
    pubsubDomain: 'channels.buddycloud.org'
};

// Development settings (useful for local debugging)
exports.development = {
    xmppDomain: 'localhost',
    xmppHost: 'localhost',
    xmppPort: '5222',
    pubsubDomain: 'localhost'
};

// Testing settings (used by the unit tests)
exports.testing = {
    xmppDomain: 'localhost',
    xmppHost: 'localhost',
    xmppPort: '5888',
    pubsubDomain: 'localhost'
};
