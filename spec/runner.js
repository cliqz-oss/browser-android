'use strict';

const max_device_per_level = 1;
const max_screen_size = 7;
const tests_dir = './tests';
const standard_project = 'CLIQZ Browser (android, standard)';
const xwalk_project = 'CLIQZ Browser (android, xwalk)';


if (!process.env.TESTDROID_API_KEY) throw "Must have apikey";
if (!process.env.TESTDROID_APP_UNIVERSAL) throw "Please, specify the universal apk address";
if (!process.env.TESTDROID_APP_XWALK) throw "Please, specify the xwalk apk address";

let RestClient = require('node-rest-client').Client,
  fs = require('fs'),
  path = require('path'),
  _ = require('underscore'),
  Promise = require('promise'),
  spawn = require('child_process').spawn;

RestClient.prototype.promiseGet = function(url, args, map) {
  let self = this;
  args = args || {}
  _.extend(args, {
    headers: { Accept: 'application/json' }
  });
  return new Promise(function(resolv, reject) {
    self.get(url, args, (data, response) => {
      if (data) resolv(map ? map(data) : data)
      else reject(response);
    });
  });
}


var config = {};

let getCurrentDateTag = function(){
  let date = new Date();
  let components = [
    date.getUTCFullYear().toString(),
    date.getUTCMonth().toString(),
    date.getUTCDate().toString(),
    date.getUTCHours().toString(),
    date.getUTCMinutes().toString()
  ];
  return components.map((c)=>c.length>1?c:`0${c}`).join('');
}

let pickDevices = function(devices) {

  const levels = _.clone(config.api_levels.sort()).reverse();

  let select = function(selected, remaining, api_levels) {
    if (!remaining || remaining.length == 0 || api_levels.length == 0) {
      return selected;
    } else {
      let api_level = api_levels.pop();
      let partitions = _.partition(remaining, (device) => {
        return device.api_level == api_level;
      });
      selected = selected.concat(_.sample(partitions[0], max_device_per_level));
      return select(selected, partitions[1], api_levels);
    }
  }

  return select([], devices, levels);
}

let getTestDroidParams = function(device) {
  let target = device.api_level < 17 ? 'selendroid' : 'android';
  let project = device.api_level < 21 ? xwalk_project : standard_project;
  let now = new Date();
  let tag = getCurrentDateTag();
  let testrun = `${tag} - ${device.displayName}`
  return {
    TESTDROID_TARGET: target,
    TESTDROID_PROJECT: project,
    TESTDROID_TESTRUN: testrun,
    TESTDROID_DEVICE: device.displayName,
    APPIUM_API_LEVEL: device.api_level
  }
}

let runTests = function(devices) {
  let run = function(devices) {
    if (!devices || devices.length == 0) {
      return;
    }

    const device = devices.pop();
    let args = device.tests.map((t)=>t.file);
    let opts = {
      env: _.extend(process.env, getTestDroidParams(device)),
      stdio: 'inherit'
    };
    console.log(`Running mocha tests on ${device.displayName} (api level ${device.api_level})...`);
    let p = spawn('mocha', args, opts);
    p.on('close', (code) => {
      run(devices);
    });
  }

  run(devices.reverse());
};

let client = new RestClient({ user: process.env.TESTDROID_API_KEY, password: '' });

console.log("Loading tests...")
Promise.all(fs
  .readdirSync(tests_dir)
  .filter((file) => {
    return file.substr(-3) === ".js";
  })
  .map((file) => {
    // Try to find a line in the header that starts with 'api level:
    return new Promise((resolve, reject) => {
      let testFile = path.join(tests_dir, file);
      let rs = fs.createReadStream(testFile, { encoding: 'utf-8' });
      let acc = '';
      rs
        .on('data', (chunk) => {
          acc += chunk;
          let lines = acc.split('\n').reverse();
          while (lines.length > 1) {
            let line = lines.pop();
            let apiLevelLines = /['"]api\s+level:\s+(.+)['"]/.exec(line);
            let levelsStr = apiLevelLines ? apiLevelLines[1] : undefined;
            if (levelsStr) {
              let levels = levelsStr.split(',').map((level) => { return parseInt(level.trim()); });
              rs.close()
              resolve({file: testFile, api_levels: levels});
              return;
            }
          }
          acc = lines.pop();
        })
        .on('close', () =>{
          resolve({file: testFile, api_levels: []});
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }))
  .then((tests) => {
    config['files'] = tests;
    let levels = _.uniq(tests.map((test) => { return test.api_levels; })
      .reduce((res, levels) => { return res.concat(levels); }, []));
    config['api_levels'] = levels;
    console.log('Loading devices from testdroid...')
    return client
      .promiseGet("https://cloud.testdroid.com/api/v2/devices?limit=1000")
  })
  .then((data) => {
    console.log('Populating devices properties...');
    let devices = data.data
      .filter((device) => {
        return device.online && device.enabled && !device.locked &&
          device.osType === 'ANDROID' && _.contains(config.api_levels, device.softwareVersion.apiLevel);
      })
      .map((device) => {
        let barebone = _.pick(device, 'id', 'displayName');
        return client
          .promiseGet(
            "https://cloud.testdroid.com/api/v2/devices/${id}/properties",
            { path: { id: barebone.id} },
            (data) => {
              return data.data.reduce((result, property) => {
                let name = property.propertyGroupName.toLowerCase().replace(/ /g, '_');
                let value = property.displayName;
                result[name] = value;
                return result;
              }, barebone);
            });
      });
    return Promise.all(devices);
  })
  .then((devices) => {
    console.log('Picking devices to use...')

    let groupByLevels = (result, testFile) => {
      testFile.api_levels.forEach((level) => {
        const no = parseInt(level);
        const entry = result[no] || [];
        entry.push(testFile);
        result[level] = entry;
      });
      return result;
    }

    const phones = devices.filter((device) => {
      return device.screen_size && device.screen_size <= max_screen_size;
    });
    const testDevices = pickDevices(phones);
    const testsByApiLevel = config.files.reduce(groupByLevels, {});
    testDevices.forEach((device) => {
      let no = parseInt(device.api_level);
      device.tests = testsByApiLevel[no];
    });
    runTests(testDevices);
  })
  .catch((error) => {
    console.error(error);
  });
