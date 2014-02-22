/*
 * Copyright 2014 Abmar Barros <abmar@buddycloud.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// test/app_node.js:
// Tests requests related to the creation of application nodes.

var should = require('should');
var tutil = require('./support/testutil');

var mockConfig = {
  users: {
    'alice': 'alice'
  },
  stanzas: {}
};

describe('Application node', function() {

  before(function(done) {
    tutil.startHttpServer(function() {
      tutil.mockXmppServer(mockConfig, done);
    });
  });

  describe('GET', function() {

    it('should allow anon access', function(done) {
      var options = {
        path: '/'
      };
      tutil.get(options, function(res, body) {
        res.statusCode.should.equal(204);
        done();
      }).on('error', done);
    });

    it('should not allow wrong credentials', function(done) {
      var options = {
        path: '/',
        auth: 'alice@localhost/http:alice123'
      };
      tutil.get(options, function(res, body) {
        res.statusCode.should.equal(401);
        done();
      }).on('error', done);
    });
    
    it('should allow ok auth', function(done) {
      var options = {
        path: '/',
        auth: 'alice@localhost/http:alice'
      };
      tutil.get(options, function(res, body) {
        res.statusCode.should.equal(204);
        done();
      }).on('error', done);
    });

  });
  
  after(function() {
    tutil.end();
  });

});