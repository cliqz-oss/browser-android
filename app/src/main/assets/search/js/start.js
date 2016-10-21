System.config({
  defaultJSExtensions: true,
  bundles: {
    'app.js': ['core/startup.js']
  }
});

window.XPCOMUtils = {
  defineLazyModuleGetter: function(){},
  generateQI: function(){},
};

window.Services = {
  scriptloader: {
    loadSubScript: function(){}
  }
};

window.Components = {
  interfaces: {
    nsIAutoCompleteResult: {}
  },
  utils: {
    import: function(){}
  },
  ID: function(){}
};


System.import("core/startup").then(function (startupModule) {
  return Promise.all([
    System.import("platform/environment"),
    System.import("core/utils"),
    System.import("core/storage"),
    System.import("core/events"),
    startupModule
  ])
}).then(function (modules) {
  var environment = modules.shift().default;
  var utils = modules.shift().default;
  var Storage = modules.shift().default;
  var events = modules.shift().default;
  environment.storage = new Storage();
  window.CLIQZEnvironment = environment;
  window.CliqzUtils = utils;
  window.CliqzEvents  = events;
  utils.initPlatform(System);
  return modules.shift();
}).then(function (startupModule) {
  return startupModule.default(window, [
    "autocomplete",
    "mobile-ui",
    "mobile-dev",
    "mobile-freshtab",
    "mobile-touch",
    "static",
    "yt-downloader"
  ]);
}).then(function () {
  return CliqzUtils.init({
    lang: window.navigator.language || window.navigator.userLanguage
  });
}).then(function () {
  jsAPI.init();
  osAPI.init();
  CliqzUtils.initHomepage(true);
});
