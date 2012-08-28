/*
 * Copyright 2012 Denis Washington <denisw@online.de>
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

// cache.js:
// Simple in-memory cache.

var crypto = require('crypto');

/**
 * An in-memory key-value store with entry expiration.
 */
function Cache() {
    this._data = {};
    this._timeouts = {};
    this.onexpired = function(key, value) {};
}

/**
 * Gets the value stored for the passed key.
 */
Cache.prototype.get = function(key) {
    return this._data[key];
};

/**
 * Adds or overwrites a key-value entry to/in the cache. After
 * 'expirationTime' seconds, the entry is removed from the cache.
 * (If 'expirationTime' is not specified, the entry does not expire.)
 * Readding the same entry restarts the expiration timeout.
 */
Cache.prototype.put = function(key, value, expirationTime) {
    this.remove(key);
    this._data[key] = value;
    if (expirationTime)
        this._startTimeout(key, expirationTime);
};

Cache.prototype._startTimeout = function(key, expirationTime) {
    var self = this;
    setTimeout(function() {
        var value = self._data[key];
        if (value) {
            self.onexpired(key, value);
            delete self._data[key];
        }
    }, expirationTime * 1000);
};

/**
 * Removes the entry with the specified key from the cache.
 */
Cache.prototype.remove = function(key) {
    this._removeTimeoutIfExists(key);
    delete this._data[key];
};

Cache.prototype._removeTimeoutIfExists = function(key) {
    var timeout = this._timeouts[key];
    if (timeout) {
        clearTimeout(timeout);
        delete this._timeouts[key];
    }
};

/**
 * Generates a random, currently unused key that can be used for put().
 */
Cache.prototype.generateKey = function() {
    while (true) {
        var key = crypto.randomBytes(16).toString('hex');
        if (!(key in this._data))
            return key;
    }
};

exports.Cache = Cache;
