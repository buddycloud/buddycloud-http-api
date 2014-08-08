var winston = require('winston');
var config = require('./config');

var useJson = false;
if (config.logUseJson != null) {
    useJson = config.logUseJson;
}

var options = {
    filename: config.logFile || 'log',
    handleExceptions: true,
    level: config.logLevel || 'debug',
    json: useJson
}

var transport = null;
var transportType = config.logTransport || 'console';

if (transportType == 'file') {
    transport = new (winston.transports.File)(options);
} else if (transportType == 'console') {
    transport = new (winston.transports.Console)(options);
}

var logger = new (winston.Logger)({
    transports: [
      transport
    ]
});

module.exports = logger;