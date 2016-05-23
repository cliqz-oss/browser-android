'use strict';

let useTestdroid = process.env.TESTDROID_API_KEY &&
  process.env.TESTDROID_TARGET &&
  process.env.TESTDROID_PROJECT &&
  process.env.TESTDROID_TESTRUN &&
  process.env.TESTDROID_DEVICE;

let server = {
  host: useTestdroid ? 'appium.testdroid.com' : 'localhost',
  port: useTestdroid ? 80 : 4723
}

module.exports = server;
