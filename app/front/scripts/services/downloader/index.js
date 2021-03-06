'use strict';

require('isomorphic-fetch');
var Promise = require('bluebird');
var url = require('url');
var normalizeUrl = require('normalize-url');

var cache = {};

// This function should return properly formatted and encoded url.
// `originalUrl` may have or have not url-encoded query or its parts,
// path, may have default port (i.e. :80 for http://). This function
// will convert all such variants to a single form.
function getNormalizedUrl(originalUrl) {
  if (originalUrl.indexOf('://') == -1) {
    return originalUrl;
  }
  originalUrl = normalizeUrl(originalUrl, {
    stripWWW: false,
    removeTrailingSlash: false
  });
  var parsed = url.parse(originalUrl);
  parsed.pathname = decodeURIComponent(parsed.pathname);
  return url.format(parsed);
}

module.exports = {
  get: function(url, options, bypassCache) {
    // Make cache more efficient - use normalized url
    url = getNormalizedUrl(url);
    if (bypassCache || !cache[url]) {
      var requestPromise = fetch(url, options).then(function(response) {
        var responseText = response.text();

        if (response.status >= 400) {
          responseText.then(function(errorText) {
            throw errorText;
          });
        }
        return responseText;
      });

      if (bypassCache) {
        return requestPromise;
      }
      cache[url] = requestPromise;
    }
    return new Promise(function(resolve, reject) {
      cache[url].then(resolve).catch(reject);
    });
  },
  getJson: function(url, options, bypassCache) {
    return this.get(url, options, bypassCache)
      .then(JSON.parse)
      .catch(function(error) {
        console.trace(error);
      });
  },
  flush: function() {
    cache = {};
  }
};
