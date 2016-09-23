System.register("core/config", [], function (_export) {
  /* global {"platform":"mobile","testsBasePath":"./build/tests","testem_launchers":["Mocha","Chrome"],"settings":{"frameScriptWhitelist":["http://localhost:3000/"]},"modules":["core","autocomplete","mobile-ui","mobile-freshtab","mobile-history","mobile-touch","yt-downloader","static"],"buildEnv":"development","sourceMaps":false,"EXTENSION_VERSION":"3.8.0-beta.1"} */
  // {"platform":"mobile","testsBasePath":"./build/tests","testem_launchers":["Mocha","Chrome"],"settings":{"frameScriptWhitelist":["http://localhost:3000/"]},"modules":["core","autocomplete","mobile-ui","mobile-freshtab","mobile-history","mobile-touch","yt-downloader","static"],"buildEnv":"development","sourceMaps":false,"EXTENSION_VERSION":"3.8.0-beta.1"} is populated by build system
  "use strict";

  return {
    setters: [],
    execute: function () {
      _export("default", Object.freeze({"platform":"mobile","testsBasePath":"./build/tests","testem_launchers":["Mocha","Chrome"],"settings":{"frameScriptWhitelist":["http://localhost:3000/"]},"modules":["core","autocomplete","mobile-ui","mobile-freshtab","mobile-history","mobile-touch","yt-downloader","static"],"buildEnv":"development","sourceMaps":false,"EXTENSION_VERSION":"3.8.0-beta.1"}));
    }
  };
});