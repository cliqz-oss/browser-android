'use strict';

const useTestdroid = process.env.TESTDROID_API_KEY &&
  process.env.TESTDROID_TARGET &&
  process.env.TESTDROID_PROJECT &&
  process.env.TESTDROID_TESTRUN &&
  process.env.TESTDROID_DEVICE;

const apiLevel = process.env.APPIUM_API_LEVEL || 21;

const androidVersions = [
  { name: 'Marshmallow', version: '6.0', api: 23 },
  { name: 'Lollipop', version: '5.1', api: 22 },
  { name: 'Lollipop', version: '5.0', api: 21 },
  { name: 'KitKat', version: '4.4 - 4.4.4', api: 19 },
  { name: 'Jelly Bean', version: '4.3', api: 18 },
  { name: 'Jelly Bean', version: '4.2', api: 17 },
  { name: 'Jelly Bean', version: '4.1', api: 16 },
  { name: 'Ice Cream Sandwich', version: '4.0.3 - 4.0.4', api: 15 },
  { name: 'Ice Cream Sandwich', version: '4.0.1 - 4.0.2', api: 14 },
  { name: 'Honeycomb', version: '3.2', api: 13 },
  { name: 'Honeycomb', version: '3.1', api: 12 },
  { name: 'Honeycomb', version: '3.0', api: 11 },
  { name: 'Gingerbread', version: '2.3.3 - 2.3.7', api: 10 },
  { name: 'Gingerbread', version: '2.3 - 2.3.2', api: 9 },
  { name: 'Froyo', version: '2.2', api: 8 },
  { name: 'Eclair', version: '2.1', api: 7 },
  { name: 'Eclair', version: '2.0.1', api: 6 },
  { name: 'Eclair', version: '2.0', api: 5 },
  { name: 'Donut', version: '1.6', api: 4 },
  { name: 'Cupcake', version: '1.5', api: 3 },
];

const capabilities = {};

capabilities['platformName'] = 'Android';
capabilities['deviceName'] = 'Android Device';
capabilities['autoDismissAlerts'] = true;
capabilities['cliqz_api_level'] = apiLevel;
capabilities['appPackage'] ='com.cliqz.browser';

if (useTestdroid) {
  capabilities['testdroid_target'] = process.env.TESTDROID_TARGET;
  capabilities['testdroid_project'] = process.env.TESTDROID_PROJECT;
  capabilities['testdroid_testrun'] = process.env.TESTDROID_TESTRUN;
  capabilities['testdroid_device'] =  process.env.TESTDROID_DEVICE;
  capabilities['testdroid_app'] = apiLevel < 21 ?
    process.env.TESTDROID_APP_XWALK :
    process.env.TESTDROID_APP_UNIVERSAL;
  capabilities['testdroid_testTimeout'] = 1200; // in seconds, 20 minutes
  capabilities['testdroid_apiKey'] = process.env.TESTDROID_API_KEY;
} else {
  capabilities['appium-version'] = '1.5.2';
  capabilities['automationName'] = apiLevel < 17 ? 'Selendroid' : 'Appium';
  capabilities['platformVersion'] = androidVersions
    .filter((v)=>v.api==apiLevel)[0].version;
  capabilities['app'] = apiLevel < 21 ?
    __dirname + "/../../app/build/outputs/apk/app-xwalk-universal-debug.apk":
    __dirname + "/../../app/build/outputs/apk/app-standard-universal-debug.apk";
}

module.exports = capabilities;
