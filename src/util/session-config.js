var config = require('./config')
  , autoDiscoverCache = ('./autodiscover-cache')

module.exports = function(req, res, next) {
  req.config = config
  if (!config.autoDiscover || !req.username) {
      return next();
  }
  autoDiscoverCache.addConfig(req.username.split('@')[1], function(error, config) {
      if (error) {
          return next(error);
      }
      req.config = config;
  })
};
