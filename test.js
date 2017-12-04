var mdns = require('mdns');
var grpc = require('grpc');
var protoDescriptor = grpc.load(__dirname + "/protos/rfbridge.proto");
var rfbridge = protoDescriptor.rfbridge;

this.browser = mdns.createBrowser(mdns.tcp('rfbridge'));
var that = this;
this.browser.on('serviceUp', function(service) {
  const port = service.port;
  const ip_addr = service.addresses[service.addresses.length -1];
  
  var client = new rfbridge.RFBridge(ip_addr + ":" + port.toString(), grpc.credentials.createInsecure());
  var request = new rfbridge.CommandRequest();
  request.command = rfbridge.Command.LIGHT;
  request.times = 10;

  // 9 times at 40

  client.sendCommand(request, function(err, resp) {
    if (err) {
      console.log(err);
    } else {
      console.log(resp);
    }
    process.exit();
  });
});
this.browser.start();
