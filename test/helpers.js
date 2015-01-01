var net = require('net');

exports.nextRandomPort = function(cb) {
  var server = net.createServer(function() {
    console.log('client connected... but why?');
  });
  server.listen(0, function() {
    var port = server.address().port;
    server.close(function(err) {
      console.log('next random port: ' + port);
      cb(err, port);
    });
  });
}
