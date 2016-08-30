System.register("mobile-ui/DelayedImageLoader", [], function (_export) {
  'use strict';

  function DelayedImageLoader(selector) {
    this.DELAY = 500;
    this.BANDWITH = 2;

    this.selector = selector;
  }

  return {
    setters: [],
    execute: function () {
      DelayedImageLoader.prototype = {

        start: function start() {
          this.timeout = setTimeout(this.loadFirstBatch.bind(this), this.DELAY);
        },

        stop: function stop() {
          if (this.timeout) {
            clearTimeout(this.timeout);
          }
          this.isRunning = false;
        },

        loadFirstBatch: function loadFirstBatch() {
          this.isRunning = true;
          // TODO: Move loading of images to constructor. But make sure that DOM exists when constructor is called.
          this.elements = Array.prototype.slice.call(document.querySelectorAll(this.selector));
          this.inProcess = this.elements.length;
          if (this.inProcess === 0) {
            window.dispatchEvent(new CustomEvent("imgLoadingDone"));
            return;
          }
          Array.apply(null, Array(this.BANDWITH)).forEach(this.loadNext.bind(this));
        },

        loadNext: function loadNext() {
          var self = this;
          function safeLoadNext() {
            self.inProcess--;
            if (self.inProcess <= 0) {
              window.dispatchEvent(new CustomEvent("imgLoadingDone"));
              return;
            }
            self.loadNext();
          };

          var el = self.elements.shift();
          if (!self.isRunning) {
            return;
          }
          if (!el) {
            return;
          }

          if (el.dataset.src) {

            // TODO: onerror should show default error img
            el.onload = el.onerror = safeLoadNext;
            el.src = el.dataset.src;
          } else if (el.dataset.style) {
            var url = self.getBackgroundImageUrlFromStyle(el.dataset.style),
                img = new Image();
            // TODO: onerror should show default error img
            img.onload = img.onerror = function () {
              el.setAttribute('style', el.dataset.style);
              safeLoadNext();
            };
            img.src = url;
          }
        },

        getBackgroundImageUrlFromStyle: function getBackgroundImageUrlFromStyle(style) {
          var match = style.match(/background-image:\s*url\(([^\)]*)\)/);
          return match && match.length === 2 ? match[1] : '';
        }
      };

      _export("default", DelayedImageLoader);
    }
  };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vYmlsZS11aS9EZWxheWVkSW1hZ2VMb2FkZXIuZXMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLGNBQVksQ0FBQzs7QUFFYixXQUFTLGtCQUFrQixDQUFDLFFBQVEsRUFBRTtBQUNwQyxRQUFJLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQztBQUNqQixRQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQzs7QUFFbEIsUUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7R0FDMUI7Ozs7O0FBRUQsd0JBQWtCLENBQUMsU0FBUyxHQUFHOztBQUU3QixhQUFLLEVBQUUsaUJBQVc7QUFDaEIsY0FBSSxDQUFDLE9BQU8sR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQ3ZFOztBQUVELFlBQUksRUFBRSxnQkFBVztBQUNmLGNBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTtBQUNoQix3QkFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztXQUM1QjtBQUNELGNBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO1NBQ3hCOztBQUVELHNCQUFjLEVBQUUsMEJBQVc7QUFDekIsY0FBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7O0FBRXRCLGNBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztBQUNyRixjQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO0FBQ3RDLGNBQUcsSUFBSSxDQUFDLFNBQVMsS0FBSyxDQUFDLEVBQUU7QUFDdkIsa0JBQU0sQ0FBQyxhQUFhLENBQUMsSUFBSSxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO0FBQ3hELG1CQUFPO1dBQ1I7QUFDRCxlQUFLLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7U0FDM0U7O0FBRUQsZ0JBQVEsRUFBRSxvQkFBWTtBQUNwQixjQUFJLElBQUksR0FBRyxJQUFJLENBQUM7QUFDaEIsbUJBQVMsWUFBWSxHQUFHO0FBQ3BCLGdCQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7QUFDakIsZ0JBQUcsSUFBSSxDQUFDLFNBQVMsSUFBSSxDQUFDLEVBQUU7QUFDdEIsb0JBQU0sQ0FBQyxhQUFhLENBQUMsSUFBSSxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO0FBQ3hELHFCQUFPO2FBQ1I7QUFDRCxnQkFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1dBQ2pCLENBQUM7O0FBRUosY0FBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUMvQixjQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRTtBQUNsQixtQkFBTztXQUNSO0FBQ0QsY0FBSSxDQUFDLEVBQUUsRUFBRTtBQUNQLG1CQUFPO1dBQ1I7O0FBRUQsY0FBSSxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRTs7O0FBR2xCLGNBQUUsQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDLE9BQU8sR0FBRyxZQUFZLENBQUM7QUFDdEMsY0FBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQztXQUN6QixNQUFNLElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUU7QUFDM0IsZ0JBQUksR0FBRyxHQUFHLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQztnQkFDM0QsR0FBRyxHQUFHLElBQUksS0FBSyxFQUFFLENBQUM7O0FBRXRCLGVBQUcsQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDLE9BQU8sR0FBRyxZQUFZO0FBQ3JDLGdCQUFFLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzNDLDBCQUFZLEVBQUUsQ0FBQzthQUNoQixDQUFBO0FBQ0QsZUFBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7V0FDZjtTQUNGOztBQUVELHNDQUE4QixFQUFFLHdDQUFVLEtBQUssRUFBRTtBQUMvQyxjQUFJLEtBQUssR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLHFDQUFxQyxDQUFDLENBQUM7QUFDL0QsaUJBQU8sQUFBQyxLQUFLLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEdBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztTQUN0RDtPQUNGLENBQUM7O3lCQUVhLGtCQUFrQiIsImZpbGUiOiJtb2JpbGUtdWkvRGVsYXllZEltYWdlTG9hZGVyLmVzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBEZWxheWVkSW1hZ2VMb2FkZXIoc2VsZWN0b3IpIHtcbiAgdGhpcy5ERUxBWSA9IDUwMDtcbiAgdGhpcy5CQU5EV0lUSCA9IDI7XG5cbiAgdGhpcy5zZWxlY3RvciA9IHNlbGVjdG9yO1xufVxuXG5EZWxheWVkSW1hZ2VMb2FkZXIucHJvdG90eXBlID0ge1xuXG4gIHN0YXJ0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnRpbWVvdXQgPSBzZXRUaW1lb3V0KHRoaXMubG9hZEZpcnN0QmF0Y2guYmluZCh0aGlzKSwgdGhpcy5ERUxBWSk7XG4gIH0sXG5cbiAgc3RvcDogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMudGltZW91dCkge1xuICAgICAgY2xlYXJUaW1lb3V0KHRoaXMudGltZW91dCk7XG4gICAgfVxuICAgIHRoaXMuaXNSdW5uaW5nID0gZmFsc2U7XG4gIH0sXG5cbiAgbG9hZEZpcnN0QmF0Y2g6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuaXNSdW5uaW5nID0gdHJ1ZTtcbiAgICAvLyBUT0RPOiBNb3ZlIGxvYWRpbmcgb2YgaW1hZ2VzIHRvIGNvbnN0cnVjdG9yLiBCdXQgbWFrZSBzdXJlIHRoYXQgRE9NIGV4aXN0cyB3aGVuIGNvbnN0cnVjdG9yIGlzIGNhbGxlZC5cbiAgICB0aGlzLmVsZW1lbnRzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCh0aGlzLnNlbGVjdG9yKSk7XG4gICAgdGhpcy5pblByb2Nlc3MgPSB0aGlzLmVsZW1lbnRzLmxlbmd0aDtcbiAgICBpZih0aGlzLmluUHJvY2VzcyA9PT0gMCkge1xuICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KFwiaW1nTG9hZGluZ0RvbmVcIikpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBBcnJheS5hcHBseShudWxsLCBBcnJheSh0aGlzLkJBTkRXSVRIKSkuZm9yRWFjaCh0aGlzLmxvYWROZXh0LmJpbmQodGhpcykpO1xuICB9LFxuXG4gIGxvYWROZXh0OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGZ1bmN0aW9uIHNhZmVMb2FkTmV4dCgpIHtcbiAgICAgICAgc2VsZi5pblByb2Nlc3MtLTtcbiAgICAgICAgaWYoc2VsZi5pblByb2Nlc3MgPD0gMCkge1xuICAgICAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudChcImltZ0xvYWRpbmdEb25lXCIpKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgc2VsZi5sb2FkTmV4dCgpO1xuICAgICAgfTtcblxuICAgIHZhciBlbCA9IHNlbGYuZWxlbWVudHMuc2hpZnQoKTtcbiAgICBpZighc2VsZi5pc1J1bm5pbmcpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKCFlbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChlbC5kYXRhc2V0LnNyYykge1xuXG4gICAgICAvLyBUT0RPOiBvbmVycm9yIHNob3VsZCBzaG93IGRlZmF1bHQgZXJyb3IgaW1nXG4gICAgICBlbC5vbmxvYWQgPSBlbC5vbmVycm9yID0gc2FmZUxvYWROZXh0O1xuICAgICAgZWwuc3JjID0gZWwuZGF0YXNldC5zcmM7XG4gICAgfSBlbHNlIGlmIChlbC5kYXRhc2V0LnN0eWxlKSB7XG4gICAgICB2YXIgdXJsID0gc2VsZi5nZXRCYWNrZ3JvdW5kSW1hZ2VVcmxGcm9tU3R5bGUoZWwuZGF0YXNldC5zdHlsZSksXG4gICAgICAgICAgaW1nID0gbmV3IEltYWdlKCk7XG4gICAgICAvLyBUT0RPOiBvbmVycm9yIHNob3VsZCBzaG93IGRlZmF1bHQgZXJyb3IgaW1nXG4gICAgICBpbWcub25sb2FkID0gaW1nLm9uZXJyb3IgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGVsLnNldEF0dHJpYnV0ZSgnc3R5bGUnLCBlbC5kYXRhc2V0LnN0eWxlKTtcbiAgICAgICAgc2FmZUxvYWROZXh0KCk7XG4gICAgICB9XG4gICAgICBpbWcuc3JjID0gdXJsO1xuICAgIH1cbiAgfSxcblxuICBnZXRCYWNrZ3JvdW5kSW1hZ2VVcmxGcm9tU3R5bGU6IGZ1bmN0aW9uIChzdHlsZSkge1xuICAgIHZhciBtYXRjaCA9IHN0eWxlLm1hdGNoKC9iYWNrZ3JvdW5kLWltYWdlOlxccyp1cmxcXCgoW15cXCldKilcXCkvKTtcbiAgICByZXR1cm4gKG1hdGNoICYmIG1hdGNoLmxlbmd0aCA9PT0gMikgPyBtYXRjaFsxXSA6ICcnO1xuICB9XG59O1xuXG5leHBvcnQgZGVmYXVsdCBEZWxheWVkSW1hZ2VMb2FkZXI7XG4iXX0=