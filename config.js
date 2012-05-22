// config.js
// =========
// This file contains all settings for the HTTP API server. Multiple
// configuration "profiles" with different settings can be specified,
// like so:
//
//     exports.profileA = {
//         option: value,
//         ...
//     };
//
//     exports.profileB = {
//         option: value,
//         ...
//     };
//
// You can choose a particular profile on startup by setting the NODE_ENV
// environment variable. for instance, the following command line starts
// the server with the "development" profile:
//
//     NODE_ENV=development node server.js
//
// By default, "production" is assumed.
//
// All options specified in "exports._" apply to all profiles, except
// for those that explicitly override them.

// Settings for all profiles.
exports._ = {
    port: 3000,
};

// Production settings. The default.
exports.production = {
    xmppDomain: 'buddycloud.org',
    xmppAnonymousDomain: 'anon.buddycloud.org',
    pubsubHost: 'channels.buddycloud.org'
};

// Settings used by the XMPP mock server for tests.
exports.testing = {
    xmppDomain: 'localhost',
    xmppHost: 'localhost',
    xmppPort: '5888',
    pubsubHost: 'localhost'
};
