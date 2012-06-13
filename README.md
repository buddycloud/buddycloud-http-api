buddycloud HTTP API
===================

This little server implements a simple REST-like HTTP interface to a
[buddycloud][bc] instance. At its heart, it is a proxy service that
exposes the [XMPP][xmpp] publish-subscribe nodes underlying each buddycloud
channel as Atom feeds that can be both received and modified. The
interface follows the [Atom Publishing Protocol][atompub] as much
as possible.

[bc]: http://buddycloud.com/
[xmpp]: http://xmpp.org/
[atompub]: http://www.atomenabled.org/developers/protocol/

Setup
-----

The server is written on top of [Node.js](http://nodejs.org/), so you need
to install that first.

After getting the server's code, change to its root directory and use Node's
package manager to install all other dependencies:

    npm install

You can then start it by invoking

    npm start

The tests are run with

    npm test

The server needs to be configured for the buddycloud/XMPP server it should
communicate with. See `config.js`.

Configuration
-------------

You can configure the HTTP API server by editing `config.js` in the server's
root direcroty. This file is made up of multiple "profile" definitions of
the form

    exports.profileName = {
        option1: value1,
        option2: value2,
        …
    };

Each profile specifies a different configuration. For exmaple, the `testing`
profile is used by the unit tests, while `development` is thought as a
configuration useful for local debugging. You can define as many other
profiles as you want and load them by setting the `NODE_ENV` environment
variable at startup, like so:

    NODE_ENV=myprofile npm start

By default, the `production` profile is used.

For added convenience, every option value defined in the special "underscore
profile" (`_`) applies to all profiles that don't explicitly override it.
As an example, the following snippet tells the server to listen on port
3000 by default, but to use 3001 for the `testing` profile:

    exports._ = {
        port: 3000
    };

    exports.testing = {
        post: 3001,
        …
    }

The following configuration options are supported:

- **port** (Required): The port on which the server listens for HTTP requests.
- **xmppDomain** (Required): The XMPP domain to which the server belongs. This
  defines the XMPP server used for authentication and presence.
- **xmppHost** (Optional): The hostname of the proxied XMPP server. This is
  only needed if the hostname and port cannot be resolved from the *xmppDomain*
  via DNS service discovery.
- **xmppPort** (Optional): The proxied XMPP server's port. See above.
- **xmppAnonymousDomain** (Optional): The XMPP domain used for anonymous
  sessions. If omitted, *xmppDomain* is assumed to handle this case.
- **xmppAnonymousHost** (Optional): Like *xmppHost*, but for
  *xmppAnonymousDomain*.
- **xmppAnonymousPort** (Optional): Like *xmppPort*, but for
  *xmppAnonymousDomain*.
- **sessionExpirationTime** (Optional): Number of seconds before a proxied
  XMPP session expires. By default, this is 600 (10 minutes).
- **https** (Optional): If true, the server communicates exclusively via
  HTTPS. *httpsCert* and *httpsKey* must be specified in this case.
- **httpsCert** (Optional): The SSL certificate to use if **https** is defined.
- **httpsKey** (Optional): The SSL private key to use if **https** is defined.
