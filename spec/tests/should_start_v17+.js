'use strict';
'api level: 17,18,19';

const testpage = "https://cdn.cliqz.com/mobile/browser/tests/testpage.html";
const cardPosScript = "(parseInt(document.getElementById('cliqz-results').style.marginLeft) -parseInt(document.getElementById('cliqz-results').getBoundingClientRect().left)) / parseInt(document.getElementsByClassName('frame')[0].style.width);";

require("../helpers/setup");

var wd = require("wd"),
    _ = require('underscore'),
    Promise = require('promise'),
    serverConfig = require('../helpers/servers'),
    assert = require('chai').assert;

let id = (id) => process.env.APPIUM_API_LEVEL < 18 ? id : `com.cliqz.browser:id/${id}`;

describe("Browser", function () {
  this.timeout(300000);
  var driver;
  var allPassed = true;

  before(function () {
    driver = wd.promiseChainRemote(serverConfig);
    require("../helpers/logging").configure(driver);
    var desired = _.clone(require("../helpers/caps"));
    return driver
      .init(desired)
      .setImplicitWaitTimeout(3000);
  });

  after(function () {
    return driver
      .quit();
  });

  beforeEach(function () {
    return driver
      .context('NATIVE_APP')
      .setOrientation('PORTRAIT');
  });

  it("should show onboarding", function () {
    return driver
      .dismissGoogleServicesDialog()
      .waitForElementByAccessibilityId("Next")
        .click()
      .waitForElementByAccessibilityId("Start now!")
        .click()
      .elementByAccessibilityId("Search Bar")
        .should.eventually.exist;
  });

  it("should navigate to test page", function() {
    return driver
      .waitForElementByAccessibilityId("Search Bar")
        .sendKeys(testpage)
        .pressDeviceKey(66)
      .context("WEBVIEW_com.cliqz.browser")
      .elementById("datetime")
        .should.eventually.exist
      .context("NATIVE_APP")
  });
  
  it("should show multiple cards when in landscape", function() {
    const storage = { width: 0, x: 0 };
    return driver
      .waitForElementByAccessibilityId("Search Bar")
        .sendKeys("pippo")
      .setOrientation('LANDSCAPE')
      .context("WEBVIEW_com.cliqz.browser")
      .findWindowWithTitle("developer tool")
      .waitForElementById('cliqz-results')
        .then(function(el) {
          return driver.getSize(el);
        })
        .then(function(size) {
          storage.width = parseInt(size.width);
          return driver;
        })
      .eval("document.getElementsByClassName('frame')[2].style.left")
        .then(function (value) {
          storage.x = parseInt(value);
          assert.isBelow(storage.x, storage.width, "The third card is not visible");
          return driver;
        });
  });

  it("should scroll", function () {
    const dimen = {height: 0, width: 0};
    return driver
      .getWindowSize()
        .then(function(dimensions) {
          dimen.height = dimensions.height;
          dimen.width = dimensions.width;
        })
      .elementByAccessibilityId("Search Bar")
        .clearSearchBar()
        .sendKeys("pippo")
      .sleep(1000)
      .context("WEBVIEW_com.cliqz.browser")
      .findWindowWithTitle("developer tool")
        .eval(cardPosScript)
        .then(function(pos) {
          assert.equal(Math.floor(pos), 0, "Error in scrolling.");
        })
      .context("NATIVE_APP")
        .then(function() {
          return driver.swipe({
           startX: 4*dimen.width/5, startY: dimen.height/2,
           endX: dimen.width/5, endY: dimen.height/2,
           duration: 500})
        })
      .sleep(600)
      .context("WEBVIEW_com.cliqz.browser")
      .findWindowWithTitle("developer tool")
        .eval(cardPosScript)
        .then(function(pos) {
         assert.equal(Math.floor(pos), 1, "Error in scrolling.");
        })
      .context("NATIVE_APP")
        .then(function() {
          return driver.swipe({
            startX: dimen.width/5, startY: dimen.height/2,
            endX: 4*dimen.width/5, endY: dimen.height/2,
            duration: 500})
        })
      .sleep(600)
      .context("WEBVIEW_com.cliqz.browser")
      .findWindowWithTitle("developer tool")
        .eval(cardPosScript)
        .then(function(pos) {
          assert.equal(Math.floor(pos), 0, "Error in scrolling.");
        });
  });

   it("should not reload the page when rotating", function() {
    const storage = { value: "" };
    return driver
      .elementByAccessibilityId("Search Bar")
        .clearSearchBar()
        .sendKeys(testpage)
        .pressDeviceKey(66)
      .context("WEBVIEW_com.cliqz.browser")
      .findWindowWithTitle("CLIQZ Browser Test Page")
      .sleep(1000) // Need to wait to let javascript been executed
      .waitForElementById("datetime")
        .text()
        .then(function (text) {
          storage.value = text;
          return driver;
        })
      .context("NATIVE_APP")
      .setOrientation('LANDSCAPE')
      .sleep(1000) // Needed, to be sure it complete the animation
      .context("WEBVIEW_com.cliqz.browser")
      .waitForElementById("datetime")
        .text()
        .then(function (text) {
          assert.equal(text, storage.value);
          return driver;
        })
   });

});
