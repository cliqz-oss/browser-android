var wd = require("wd")
  utils = require('./utils');

require('colors');
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
var should = chai.should();
chaiAsPromised.transferPromiseness = wd.transferPromiseness;

wd.addPromiseChainMethod('dismissGoogleServicesDialog', utils.dismissGoogleServicesDialog);

exports.should = should;
