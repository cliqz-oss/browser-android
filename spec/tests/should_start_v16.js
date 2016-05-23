'use strict';
'api level: 16';

require("../helpers/setup");

var wd = require("wd"),
    _ = require('underscore'),
    serverConfig = require('../helpers/servers');

console.log(serverConfig['cliqz_api_level']);
let id = (id) => process.env.APPIUM_API_LEVEL < 18 ? id : `com.cliqz.browser:id/${id}`;

describe("Browser", function () {
  this.timeout(300000);
  var driver;
  var allPassed = true;

  before(function () {
    driver = wd.promiseChainRemote(serverConfig);
    require("../helpers/logging").configure(driver);
    var desired = _.clone(require("../helpers/caps"));
    console.log(serverConfig);
    console.log(desired);
    return driver
      .init(desired)
      .setImplicitWaitTimeout(3000);
  });

  after(function () {
    return driver
      .quit();
  });

  it("should show onboarding", function () {
    return driver
      .dismissGoogleServicesDialog()
      .waitForElementById("next")
        .click()
      .waitForElementById("start_now")
        .click()
      .elementById("search_bar")
        .should.eventually.exist;
  });
});
