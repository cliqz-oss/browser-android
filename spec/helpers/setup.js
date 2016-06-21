var wd = require("wd")
  utils = require('./utils');

require('colors');
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
var actions = require("./actions");
chai.use(chaiAsPromised);
var should = chai.should();
chaiAsPromised.transferPromiseness = wd.transferPromiseness;

wd.addPromiseChainMethod('dismissGoogleServicesDialog', utils.dismissGoogleServicesDialog);
wd.addPromiseChainMethod('findWindowWithTitle', utils.findWindowWithTitle);
wd.addPromiseChainMethod('swipe', actions.swipe);
wd.addPromiseChainMethod('clearSearchBar', utils.clearSearchBar);
exports.should = should;
