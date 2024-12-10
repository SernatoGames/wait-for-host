var net = require('net');
const { exec } = require('node:child_process');

function debug() {
  console.log.apply(null, arguments);
}

module.exports = function(host, port, options, cb) {

  // allow for missing options
  if (typeof options == "function") {
    cb = options;
    options = {};
  }

  // options.debug = true;

  var retriesRemaining = options.numRetries || 10;
  var retryInterval = options.retryInterval || 1000;
  var timer = null, socket = null;

  if (!(retriesRemaining > 0)) throw new Error('invalid value for option "numRetries"');
  if (!(retryInterval > 0)) throw new Error('invalid value for option "retryInterval"');

  if (options.debug) debug('options', options);

  function clearTimerAndDestroySocket() {
    clearTimeout(timer);
    timer = null;
    if (socket) {
      socket.destroy();
    }
    socket = null;
  }

  function retry() {
    if (options.debug) debug('about to clear timeout and retry, port=' + port + ', retriesRemaining=' + retriesRemaining + ', key=' + options.key);
    tryToConnect();
  };

  function tryToConnect() {

    clearTimerAndDestroySocket();

    if (--retriesRemaining < 0) return cb(new Error('out of retries'));

    if(options.udp){
      exec('netstat -an -p udp', (error, stdout, stderr) => {
        const regex = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?):\d{1,5}\b/gm;
        let matches = stdout.match(regex);
        let hasMatch = false;
        for(let m of matches){
          var s = m.split(':');
          if(s[1] == port){
            hasMatch = true;
            break;
          }
        }

        if(hasMatch){
          if (options.debug) debug('listening!');
          clearTimerAndDestroySocket();
          if (retriesRemaining > 0) cb(null);
        } else {
          if (options.debug) debug(error);
          timer = setTimeout(function(){retry();}, retryInterval);
        }
      });
    } else {
      socket = net.createConnection(port, host, function(err) {
        if (options.debug) debug('connected!');
        clearTimerAndDestroySocket();
        if (retriesRemaining > 0) cb(null);
      });
  
      timer = setTimeout(function() { retry(); }, retryInterval);
  
      socket.on('error', function(err) {
        if (options.debug) debug('error', err);
        clearTimerAndDestroySocket();
        setTimeout(retry, retryInterval);
      });
    }
  }

  tryToConnect();

};
