System.register('tests/mobile-history/history-test', [], function (_export) {
  'use strict';

  return {
    setters: [],
    execute: function () {
      _export('default', describeModule('mobile-history/history', function () {
        return {
          'mobile-touch/longpress': {
            'default': { onTap: function onTap() {}, onLongPress: function onLongPress() {} }
          },
          'core/cliqz': { environment: {}, utils: {} }
        };
      }, function () {
        var _done = undefined;
        beforeEach(function () {
          var _this = this;

          this.module()['default'].displayData = function (data) {
            return _this.module()['default'].sendShowTelemetry(data);
          };
          this.deps('core/cliqz').environment.getLocalStorage = function (_) {
            return { getObject: function getObject() {
                return [];
              } };
          };
          this.deps('core/cliqz').utils.telemetry = function (msg) {
            chai.expect(msg).to.be.ok;
            chai.expect(msg.action).to.equal('show');
            _done();
          };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInRlc3RzL21vYmlsZS1oaXN0b3J5L2hpc3RvcnktdGVzdC5lcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7eUJBQWUsY0FBYyxDQUFDLHdCQUF3QixFQUNwRCxZQUFZO0FBQ1YsZUFBTztBQUNMLGtDQUF3QixFQUFFO0FBQ3hCLHVCQUFTLEVBQUUsS0FBSyxFQUFBLGlCQUFHLEVBQUcsRUFBRSxXQUFXLEVBQUEsdUJBQUcsRUFBRyxFQUFFO1dBQzVDO0FBQ0Qsc0JBQVksRUFBRSxFQUFFLFdBQVcsRUFBRSxFQUFHLEVBQUUsS0FBSyxFQUFFLEVBQUcsRUFBRTtTQUMvQyxDQUFDO09BQ0gsRUFDRCxZQUFZO0FBQ1YsWUFBSSxLQUFLLFlBQUEsQ0FBQztBQUNWLGtCQUFVLENBQUMsWUFBWTs7O0FBQ3JCLGNBQUksQ0FBQyxNQUFNLEVBQUUsV0FBUSxDQUFDLFdBQVcsR0FBRyxVQUFBLElBQUk7bUJBQUksTUFBSyxNQUFNLEVBQUUsV0FBUSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQztXQUFBLENBQUM7QUFDMUYsY0FBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxXQUFXLENBQUMsZUFBZSxHQUFHLFVBQUEsQ0FBQyxFQUFLO0FBQzFELG1CQUFPLEVBQUUsU0FBUyxFQUFBLHFCQUFHO0FBQUUsdUJBQU8sRUFBRSxDQUFDO2VBQUUsRUFBRSxDQUFDO1dBQ3ZDLENBQUM7QUFDRixjQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsVUFBQSxHQUFHLEVBQUk7QUFDN0MsZ0JBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7QUFDMUIsZ0JBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDekMsaUJBQUssRUFBRSxDQUFDO1dBQ1QsQ0FBQztTQUNMLENBQUMsQ0FBQztBQUNILGdCQUFRLENBQUMsV0FBVyxFQUFFLFlBQVk7QUFDaEMsWUFBRSxDQUFDLCtDQUErQyxFQUFFLFVBQVUsSUFBSSxFQUFFO0FBQ2xFLGlCQUFLLEdBQUcsSUFBSSxDQUFDO0FBQ2IsZ0JBQUksQ0FBQyxNQUFNLEVBQUUsV0FBUSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQztXQUN2QyxDQUFDLENBQUM7QUFDSCxZQUFFLENBQUMsaURBQWlELEVBQUUsVUFBVSxJQUFJLEVBQUU7QUFDcEUsaUJBQUssR0FBRyxJQUFJLENBQUM7QUFDYixnQkFBSSxDQUFDLE1BQU0sRUFBRSxXQUFRLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1dBQ3pDLENBQUMsQ0FBQztTQUNKLENBQUMsQ0FBQztPQUNKLENBQ0YiLCJmaWxlIjoidGVzdHMvbW9iaWxlLWhpc3RvcnkvaGlzdG9yeS10ZXN0LmVzIiwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGRlZmF1bHQgZGVzY3JpYmVNb2R1bGUoJ21vYmlsZS1oaXN0b3J5L2hpc3RvcnknLFxuICBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICdtb2JpbGUtdG91Y2gvbG9uZ3ByZXNzJzoge1xuICAgICAgICBkZWZhdWx0OiB7IG9uVGFwKCkgeyB9LCBvbkxvbmdQcmVzcygpIHsgfSB9XG4gICAgICB9LFxuICAgICAgJ2NvcmUvY2xpcXonOiB7IGVudmlyb25tZW50OiB7IH0sIHV0aWxzOiB7IH0gfVxuICAgIH07XG4gIH0sXG4gIGZ1bmN0aW9uICgpIHtcbiAgICBsZXQgX2RvbmU7XG4gICAgYmVmb3JlRWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLm1vZHVsZSgpLmRlZmF1bHQuZGlzcGxheURhdGEgPSBkYXRhID0+IHRoaXMubW9kdWxlKCkuZGVmYXVsdC5zZW5kU2hvd1RlbGVtZXRyeShkYXRhKTsgXG4gICAgICB0aGlzLmRlcHMoJ2NvcmUvY2xpcXonKS5lbnZpcm9ubWVudC5nZXRMb2NhbFN0b3JhZ2UgPSBfICA9PiB7IFxuICAgICAgICByZXR1cm4geyBnZXRPYmplY3QoKSB7IHJldHVybiBbXTsgfSB9O1xuICAgICAgfTtcbiAgICAgIHRoaXMuZGVwcygnY29yZS9jbGlxeicpLnV0aWxzLnRlbGVtZXRyeSA9IG1zZyA9PiB7XG4gICAgICAgICAgY2hhaS5leHBlY3QobXNnKS50by5iZS5vaztcbiAgICAgICAgICBjaGFpLmV4cGVjdChtc2cuYWN0aW9uKS50by5lcXVhbCgnc2hvdycpO1xuICAgICAgICAgIF9kb25lKCk7XG4gICAgICAgIH07XG4gICAgfSk7XG4gICAgZGVzY3JpYmUoJ1RlbGVtZXRyeScsIGZ1bmN0aW9uICgpIHtcbiAgICAgIGl0KCdTaG91bGQgc2VuZCBzaG93IHRlbGVtZXRyeSBzaWduYWwgZm9yIGhpc3RvcnknLCBmdW5jdGlvbiAoZG9uZSkge1xuICAgICAgICBfZG9uZSA9IGRvbmU7XG4gICAgICAgIHRoaXMubW9kdWxlKCkuZGVmYXVsdC5zaG93SGlzdG9yeShbXSk7XG4gICAgICB9KTtcbiAgICAgIGl0KCdTaG91bGQgc2VuZCBzaG93IHRlbGVtZXRyeSBzaWduYWwgZm9yIGZhdm9yaXRlcycsIGZ1bmN0aW9uIChkb25lKSB7XG4gICAgICAgIF9kb25lID0gZG9uZTtcbiAgICAgICAgdGhpcy5tb2R1bGUoKS5kZWZhdWx0LnNob3dGYXZvcml0ZXMoW10pO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbik7Il19