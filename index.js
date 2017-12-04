var Accessory, Service, Characteristic, UUIDGen;
var mdns = require('mdns');
var grpc = require('grpc');
var protoDescriptor = grpc.load(__dirname + "/protos/rfbridge.proto");
var rfbridge = protoDescriptor.rfbridge;

module.exports = function(homebridge) {
  Accessory = homebridge.platformAccessory;
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;

  homebridge.registerPlatform("homebridge-rfbridge", "RFBridge", RFBridge, true);
};

function RFBridge(log, config, api) {
  log("RFBridge Init");
  this.log = log;
  this.config = config;
  this.accessories = [];

  var sequence = [
    mdns.rst.DNSServiceResolve(),
    'DNSServiceGetAddrInfo' in mdns.dns_sd ? mdns.rst.DNSServiceGetAddrInfo() : mdns.rst.getaddrinfo({families:[4]}),
    mdns.rst.makeAddressesUnique()
  ];
  this.browser = mdns.createBrowser(mdns.tcp('rfbridge'), {resolverSequence: sequence});
  var that = this;
  this.browser.on('serviceUp', function(service) {
    const port = service.port;
    const ip_addr = service.addresses[service.addresses.length -1];
    const name = service.txtRecord.name;
    const device_type = service.txtRecord.device_type
    
    const filtered = that.accessories.filter(function(val) { return val.context.name == name });

    if (filtered.length == 0) {
      that.addAccessory(ip_addr, port, name, device_type);
    } else {
      var a = filtered[0];
      a.context.ipAddr = ip_addr;
      a.context.port = port;
      a.context.client = new rfbridge.RFBridge(a.context.ipAddr + ":" + a.context.port.toString(), grpc.credentials.createInsecure());
    }
  });

  if (api) {
      // Save the API object as plugin needs to register new accessory via this object
      this.api = api;

      // Listen to event "didFinishLaunching", this means homebridge already finished loading cached accessories.
      // Platform Plugin should only register new accessory that doesn't exist in homebridge after this event.
      // Or start discover new accessories.
      this.api.on('didFinishLaunching', function() {
        that.log("DidFinishLaunching");
        that.browser.start();
      }.bind(this));
  }
}

RFBridge.prototype.addAccessory = function(ipAddr, port, name, deviceType) {
  this.log("Add Accessory");
  var platform = this;
  var uuid;

  uuid = UUIDGen.generate(name);
  var accessory = new Accessory(name, uuid);
  accessory.context.name = name;
  accessory.context.deviceType = deviceType;
  accessory.context.ipAddr = ipAddr;
  accessory.context.port = port;
  this.configureAccessory(accessory)
  
  this.api.registerPlatformAccessories("homebridge-rfbridge", "RFBridge", [accessory]);
}

RFBridge.prototype.addOrCreateService = function(accessory, serviceType) {
  if (accessory.getService(serviceType) == null) {
    return accessory.addService(serviceType, accessory.context.name)
  } else {
    return accessory.getService(serviceType);
  }
}

RFBridge.prototype.configureAccessory = function(accessory) {
  this.log(accessory.displayName, "Configure Accessory");
  var platform = this;

  // Set the accessory to reachable if plugin can currently process the accessory,
  // otherwise set to false and update the reachability later by invoking 
  // accessory.updateReachability()
  accessory.reachable = true;
  accessory.context.isSendingBrightness = false;
  accessory.context.lightBlubOn = false;
  accessory.context.fanRotationSpeed = 0;
  accessory.context.fanOn = false;

  accessory.on('identify', function(paired, callback) {
    platform.log(accessory.displayName, "Identify!!!");
    callback();
  });
  // Plugin can save context on accessory to help restore accessory in configureAccessory()
  accessory.context.client = new rfbridge.RFBridge(accessory.context.ipAddr + ":" + accessory.context.port.toString(), grpc.credentials.createInsecure());

  // Make sure you provided a name for service, otherwise it may not visible in some HomeKit apps
  if (accessory.context.deviceType == "fan") {
    this.addOrCreateService(accessory, Service.Lightbulb)
      .getCharacteristic(Characteristic.On)
      .on("get", function(callback) {
        callback(accessory.context.lightBlubOn);
      })
      .on('set', function(value, callback) {
        platform.log(accessory.displayName, "Light -> " + value);
        platform.sendCommand(accessory, rfbridge.Command.LIGHT);
        accessory.context.lightBlubOn = value;
        callback();
      });

    this.addOrCreateService(accessory, Service.Fan)
      .getCharacteristic(Characteristic.On)
      .on("get", function(callback) {
        callback(accessory.context.fanOn);
      })
      .on("set", function(value, callback) {
        platform.log(accessory.displayName, "Fan -> " + value);
        if (value && !accessory.context.fanOn) {
          platform.sendCommand(accessory, rfbridge.Command.SLOW);
        } else if (accessory.context.fanOn) {
          platform.sendCommand(accessory, rfbridge.Command.STOP);
        }
        accessory.context.fanOn = value;
        callback();
      });

    // this.addOrCreateService(accessory, Service.Fan)
    //   .getCharacteristic(Characteristic.RotationSpeed)
    //   .on("get", function(callback) {
    //     callback(accessory.context.fanRotationSpeed);
    //   })
    //   .on("set", function(value, callback) {
    //     platform.log(accessory.displayName, "Fan -> " + value);
    //     const previous = accessory.context.fanRotationSpeed;
    //     if (value < 33 && value > 0 && (previous >= 33 || previous == 0)) {
    //       platform.sendCommand(accessory, rfbridge.Command.SLOW);
    //     } else if (value >= 33 && value < 67 && (previous < 33 || previous >= 67)) {
    //       platform.sendCommand(accessory, rfbridge.Command.MEDIUM);
    //     } else if (value >= 67 && previous < 67) {
    //       platform.sendCommand(accessory, rfbridge.Command.FAST);
    //     } else if (previous > 0) {
    //       platform.sendCommand(accessory, rfbridge.Command.STOP);
    //     }
    //     accessory.context.fanRotationSpeed = value;
    //     callback();
    //   });
  }

  this.accessories.push(accessory);
}

RFBridge.prototype.sendCommand = function(accessory, command) {
  var request = new rfbridge.CommandRequest();
  request.command = command
  request.times = 10

  this.log("[RFBridge] Sending command: " + command);

  accessory.context.client.sendCommand(request, function(err, resp) {
    if (err) {
      console.log(err);
    } else {
      console.log(resp);
    }
  });
}