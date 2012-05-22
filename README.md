buddycloud HTTP API
===================

The glue without the goo! Access buddycloud via HTTP.

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
