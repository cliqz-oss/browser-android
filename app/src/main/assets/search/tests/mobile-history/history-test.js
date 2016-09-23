System.register('tests/mobile-history/history-test', [], function (_export) {
  'use strict';

  return {
    setters: [],
    execute: function () {
      _export('default', describeModule('mobile-history/history', function () {
        return {
          'core/utils': { 'default': {} },
          'core/templates': { 'default': { tplCache: {} } },
          'mobile-history/webview': {
            document: {
              body: {},
              documentElement: {},
              getElementById: function getElementById() {
                return { addEventListener: function addEventListener() {} };
              }
            }
          },
          'mobile-touch/longpress': { 'default': function _default() {} }
        };
      }, function () {
        var _done = undefined;
        beforeEach(function () {
          var _this = this;

          this.module()['default'].displayData = function (data) {
            return _this.module()['default'].sendShowTelemetry(data);
          };
          this.deps('core/utils')['default'].getLocalStorage = function (_) {
            return { getObject: function getObject() {
                return [];
              } };
          };
          this.deps('core/utils')['default'].telemetry = function (msg) {
            chai.expect(msg).to.be.ok;
            chai.expect(msg.action).to.equal('show');
            _done();
          };
          this.deps('core/templates')['default'].tplCache.conversations = function (_) {};
        });
        describe('Telemetry', function () {
          it('Should send show telemetry signal for history', function (done) {
            _done = done;
            this.module()['default'].showHistory([]);
          });
          it('Should send show telemetry signal for favorites', function (done) {
            _done = done;
            this.module()['default'].showFavorites([]);
          });
        });
      }));
    }
  };
});