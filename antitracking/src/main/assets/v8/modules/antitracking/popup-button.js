System.register("antitracking/popup-button", ["core/cliqz", "core/events"], function (_export) {
  "use strict";

  var utils, CliqzEvents;

  function CliqzPopupButton(options) {
    this.CustomizableUI = Components.utils["import"]('resource:///modules/CustomizableUI.jsm', null).CustomizableUI;

    this.name = options.name;
    this.actions = options.actions;

    var tbb = this.tbb = {
      id: this.name + '-button',
      type: 'view',
      viewId: this.name + '-panel',
      label: this.name,
      tooltiptext: this.name,
      tabs: {/*tabId: {badge: 0, img: boolean}*/},
      init: null,
      codePath: ''
    };

    function populatePanel(doc, panel) {
      panel.setAttribute('id', tbb.viewId);

      var iframe = doc.createElement('iframe');
      iframe.setAttribute('type', 'content');
      iframe.setAttribute('src', 'chrome://cliqz/content/antitracking/popup.html');
      panel.appendChild(iframe);

      function toPx(pixels) {
        return pixels.toString() + 'px';
      }

      function onPopupReady() {
        if (!iframe || !iframe.contentDocument) {
          return;
        }

        var body = iframe.contentDocument.body;
        var clientHeight = body.scrollHeight;

        iframe.style.height = toPx(clientHeight);
        panel.style.height = toPx(clientHeight + panel.boxObject.height - panel.clientHeight);

        // triggered when popup is opened
        options.actions.telemetry({ action: 'click', target: 'popup', includeUnsafeCount: true });
      }
      iframe.addEventListener('load', onPopupReady, true);
    }

    tbb.codePath = 'australis';
    tbb.CustomizableUI = this.CustomizableUI;
    tbb.defaultArea = this.CustomizableUI.AREA_NAVBAR;

    var styleURI = null;

    tbb.onBeforeCreated = function (doc) {
      var panel = doc.createElement('panelview');

      populatePanel(doc, panel);

      doc.getElementById('PanelUI-multiView').appendChild(panel);

      doc.defaultView.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils).loadSheet(styleURI, 1);
    };

    var style = ['#' + tbb.id + '.off {', 'list-style-image: url(', 'chrome://cliqz/content/static/skin/images/atrack/anti-tracking-off.svg', ');', '}', '#' + tbb.id + ' {', 'list-style-image: url(', 'chrome://cliqz/content/static/skin/images/atrack/anti-tracking-on.svg', ');', '}', '#' + tbb.viewId + ',', '#' + tbb.viewId + ' > iframe {', 'width: 400px;', 'overflow: hidden !important;', '}'];

    styleURI = Services.io.newURI('data:text/css,' + encodeURIComponent(style.join('')), null, null);

    tbb.closePopup = (function (tabBrowser) {
      this.CustomizableUI.hidePanelForNode(utils.getWindow().gBrowser.ownerDocument.getElementById(tbb.viewId));
    }).bind(this);
  }

  return {
    setters: [function (_coreCliqz) {
      utils = _coreCliqz.utils;
    }, function (_coreEvents) {
      CliqzEvents = _coreEvents["default"];
    }],
    execute: function () {
      _export("default", CliqzPopupButton);

      CliqzPopupButton.prototype.updateView = function (win, clientHeight) {
        var panel = win.document.getElementById(this.tbb.viewId);
        var iframe = panel.querySelector("iframe");

        function toPx(pixels) {
          return pixels.toString() + 'px';
        }

        function onPopupReady() {
          if (!iframe || !iframe.contentDocument) {
            return;
          }

          var body = iframe.contentDocument.body;

          iframe.style.height = toPx(clientHeight);
          panel.style.height = toPx(clientHeight + panel.boxObject.height - panel.clientHeight);
        }

        onPopupReady();
      };

      CliqzPopupButton.prototype.updateState = function (win, turnOn) {
        if (!win) return;

        var button = win.document.getElementById(this.tbb.id);

        // if button is hidden via 'customize' menu, button will be undefined
        if (!button) return;

        if (turnOn) {
          button.classList.remove("off");
        } else {
          button.classList.add("off");
        }
      };

      CliqzPopupButton.prototype.setBadge = function (win, badgeText) {
        var button = win.document.getElementById(this.tbb.id);

        // if button is hidden via 'customize' menu, button will be undefined
        if (!button) return;

        if (badgeText) {
          button.setAttribute('badge', String(badgeText));
        } else {
          button.setAttribute('badge', '');
        }

        if (!button.classList.contains('badged-button')) {
          button.classList.add('badged-button');
        }

        CliqzUtils.setTimeout(function () {
          var badge = button.ownerDocument.getAnonymousElementByAttribute(button, 'class', 'toolbarbutton-badge');

          // when window is too small to display all icons, the anti-tracking badge
          // may be hidden behind a '>>' button. In this case, badge will be null.
          if (badge) {
            badge.style.cssText = 'background-color: #666; color: #fff;';
          }
        }, 250);
      };

      CliqzPopupButton.prototype.attach = function () {
        this.CustomizableUI.createWidget(this.tbb);
        this.setupCommunicationChannel();
      };

      CliqzPopupButton.prototype.destroy = function () {
        this.CustomizableUI.destroyWidget(this.tbb.id);
      };

      CliqzPopupButton.prototype.setupCommunicationChannel = function () {
        var channelName = this.name,
            actions = this.actions;

        function popupMessageHandler(msg) {
          var functionName = msg.message.functionName,
              functionArgs = msg.message.args,
              handler = actions[functionName];

          function callback(res) {
            CliqzEvents.pub(channelName + "-background", {
              id: msg.id,
              message: res
            });
          }

          if (!handler) {
            return;
          }

          handler(functionArgs, callback);
        }

        CliqzEvents.sub(channelName + "-popup", popupMessageHandler);
      };
    }
  };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFudGl0cmFja2luZy9wb3B1cC1idXR0b24uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFLQSxXQUFTLGdCQUFnQixDQUFDLE9BQU8sRUFBRTtBQUNqQyxRQUFJLENBQUMsY0FBYyxHQUFHLFVBQVUsQ0FBQyxLQUFLLFVBQU8sQ0FBQyx3Q0FBd0MsRUFBRSxJQUFJLENBQUMsQ0FBQyxjQUFjLENBQUM7O0FBRTdHLFFBQUksQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQztBQUN6QixRQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUM7O0FBRS9CLFFBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUc7QUFDbkIsUUFBRSxFQUFFLElBQUksQ0FBQyxJQUFJLEdBQUMsU0FBUztBQUN2QixVQUFJLEVBQUUsTUFBTTtBQUNaLFlBQU0sRUFBRSxJQUFJLENBQUMsSUFBSSxHQUFDLFFBQVE7QUFDMUIsV0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJO0FBQ2hCLGlCQUFXLEVBQUUsSUFBSSxDQUFDLElBQUk7QUFDdEIsVUFBSSxFQUFFLHFDQUFxQztBQUMzQyxVQUFJLEVBQUUsSUFBSTtBQUNWLGNBQVEsRUFBRSxFQUFFO0tBQ2IsQ0FBQzs7QUFFRixhQUFTLGFBQWEsQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFO0FBQ2pDLFdBQUssQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQzs7QUFFckMsVUFBSSxNQUFNLEdBQUcsR0FBRyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUN6QyxZQUFNLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztBQUN2QyxZQUFNLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxnREFBZ0QsQ0FBQyxDQUFDO0FBQzdFLFdBQUssQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7O0FBRTFCLGVBQVMsSUFBSSxD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SSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzNDLFlBQUksQ0FBQyx5QkFBeUIsRUFBRSxDQUFDO09BQ2xDLENBQUM7O0FBRUYsc0JBQWdCLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBRyxZQUFZO0FBQy9DLFlBQUksQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7T0FDaEQsQ0FBQzs7QUFFRixzQkFBZ0IsQ0FBQyxTQUFTLENBQUMseUJBQXlCLEdBQUcsWUFBWTtBQUNqRSxZQUFJLFdBQVcsR0FBRyxJQUFJLENBQUMsSUFBSTtZQUN2QixPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQzs7QUFFM0IsaUJBQVMsbUJBQW1CLENBQUMsR0FBRyxFQUFFO0FBQ2hDLGNBQUksWUFBWSxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsWUFBWTtjQUN2QyxZQUFZLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJO2NBQy9CLE9BQU8sR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7O0FBRXBDLG1CQUFTLFFBQVEsQ0FBQyxHQUFHLEVBQUU7QUFDckIsdUJBQVcsQ0FBQyxHQUFHLENBQUMsV0FBVyxHQUFDLGFBQWEsRUFBRTtBQUN6QyxnQkFBRSxFQUFFLEdBQUcsQ0FBQyxFQUFFO0FBQ1YscUJBQU8sRUFBRSxHQUFHO2FBQ2IsQ0FBQyxDQUFDO1dBQ0o7O0FBRUQsY0FBSSxDQUFDLE9BQU8sRUFBRTtBQUFFLG1CQUFPO1dBQUU7O0FBRXpCLGlCQUFPLENBQUMsWUFBWSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1NBQ2pDOztBQUVELG1CQUFXLENBQUMsR0FBRyxDQUFDLFdBQVcsR0FBQyxRQUFRLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztPQUM1RCxDQUFDIiwiZmlsZSI6ImFudGl0cmFja2luZy9wb3B1cC1idXR0b24uanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB1dGlscyB9IGZyb20gXCJjb3JlL2NsaXF6XCI7XG5pbXBvcnQgQ2xpcXpFdmVudHMgZnJvbSBcImNvcmUvZXZlbnRzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IENsaXF6UG9wdXBCdXR0b247XG5cbmZ1bmN0aW9uIENsaXF6UG9wdXBCdXR0b24ob3B0aW9ucykge1xuICB0aGlzLkN1c3RvbWl6YWJsZVVJID0gQ29tcG9uZW50cy51dGlscy5pbXBvcnQoJ3Jlc291cmNlOi8vL21vZHVsZXMvQ3VzdG9taXphYmxlVUkuanNtJywgbnVsbCkuQ3VzdG9taXphYmxlVUk7XG5cbiAgdGhpcy5uYW1lID0gb3B0aW9ucy5uYW1lO1xuICB0aGlzLmFjdGlvbnMgPSBvcHRpb25zLmFjdGlvbnM7XG5cbiAgdmFyIHRiYiA9IHRoaXMudGJiID0ge1xuICAgIGlkOiB0aGlzLm5hbWUrJy1idXR0b24nLFxuICAgIHR5cGU6ICd2aWV3JyxcbiAgICB2aWV3SWQ6IHRoaXMubmFtZSsnLXBhbmVsJyxcbiAgICBsYWJlbDogdGhpcy5uYW1lLFxuICAgIHRvb2x0aXB0ZXh0OiB0aGlzLm5hbWUsXG4gICAgdGFiczogey8qdGFiSWQ6IHtiYWRnZTogMCwgaW1nOiBib29sZWFufSovfSxcbiAgICBpbml0OiBudWxsLFxuICAgIGNvZGVQYXRoOiAnJ1xuICB9O1xuXG4gIGZ1bmN0aW9uIHBvcHVsYXRlUGFuZWwoZG9jLCBwYW5lbCkge1xuICAgIHBhbmVsLnNldEF0dHJpYnV0ZSgnaWQnLCB0YmIudmlld0lkKTtcblxuICAgIHZhciBpZnJhbWUgPSBkb2MuY3JlYXRlRWxlbWVudCgnaWZyYW1lJyk7XG4gICAgaWZyYW1lLnNldEF0dHJpYnV0ZSgndHlwZScsICdjb250ZW50Jyk7XG4gICAgaWZyYW1lLnNldEF0dHJpYnV0ZSgnc3JjJywgJ2Nocm9tZTovL2NsaXF6L2NvbnRlbnQvYW50aXRyYWNraW5nL3BvcHVwLmh0bWwnKTtcbiAgICBwYW5lbC5hcHBlbmRDaGlsZChpZnJhbWUpO1xuXG4gICAgZnVuY3Rpb24gdG9QeChwaXhlbHMpIHtcbiAgICAgIHJldHVybiBwaXhlbHMudG9TdHJpbmcoKSArICdweCc7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25Qb3B1cFJlYWR5KCkge1xuICAgICAgaWYgKCFpZnJhbWUgfHwgIWlmcmFtZS5jb250ZW50RG9jdW1lbnQpIHsgcmV0dXJuOyB9XG5cbiAgICAgIHZhciBib2R5ID0gaWZyYW1lLmNvbnRlbnREb2N1bWVudC5ib2R5O1xuICAgICAgdmFyIGNsaWVudEhlaWdodCA9IGJvZHkuc2Nyb2xsSGVpZ2h0O1xuXG4gICAgICBpZnJhbWUuc3R5bGUuaGVpZ2h0ID0gdG9QeChjbGllbnRIZWlnaHQpO1xuICAgICAgcGFuZWwuc3R5bGUuaGVpZ2h0ID0gdG9QeChjbGllbnRIZWlnaHQgKyBwYW5lbC5ib3hPYmplY3QuaGVpZ2h0IC0gcGFuZWwuY2xpZW50SGVpZ2h0ICk7XG5cbiAgICAgIC8vIHRyaWdnZXJlZCB3aGVuIHBvcHVwIGlzIG9wZW5lZFxuICAgICAgb3B0aW9ucy5hY3Rpb25zLnRlbGVtZXRyeSh7IGFjdGlvbjogJ2NsaWNrJywgdGFyZ2V0OiAncG9wdXAnLCBpbmNsdWRlVW5zYWZlQ291bnQ6IHRydWUgfSk7XG4gICAgfVxuICAgIGlmcmFtZS5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgb25Qb3B1cFJlYWR5LCB0cnVlKTtcbiAgfVxuXG4gIHRiYi5jb2RlUGF0aCA9ICdhdXN0cmFsaXMnO1xuICB0YmIuQ3VzdG9taXphYmxlVUkgPSB0aGlzLkN1c3RvbWl6YWJsZVVJO1xuICB0YmIuZGVmYXVsdEFyZWEgPSB0aGlzLkN1c3RvbWl6YWJsZVVJLkFSRUFfTkFWQkFSO1xuXG4gIHZhciBzdHlsZVVSSSA9IG51bGw7XG5cbiAgdGJiLm9uQmVmb3JlQ3JlYXRlZCA9IGZ1bmN0aW9uKGRvYykge1xuICAgIHZhciBwYW5lbCA9IGRvYy5jcmVhdGVFbGVtZW50KCdwYW5lbHZpZXcnKTtcblxuICAgIHBvcHVsYXRlUGFuZWwoZG9jLCBwYW5lbCk7XG5cbiAgICBkb2MuZ2V0RWxlbWVudEJ5SWQoJ1BhbmVsVUktbXVsdGlWaWV3JykuYXBwZW5kQ2hpbGQocGFuZWwpO1xuXG4gICAgZG9jLmRlZmF1bHRWaWV3LlF1ZXJ5SW50ZXJmYWNlKENpLm5zSUludGVyZmFjZVJlcXVlc3RvcilcbiAgICAgIC5nZXRJbnRlcmZhY2UoQ2kubnNJRE9NV2luZG93VXRpbHMpXG4gICAgICAubG9hZFNoZWV0KHN0eWxlVVJJLCAxKTtcbiAgfTtcblxuICB2YXIgc3R5bGUgPSBbXG4gICAgJyMnICsgdGJiLmlkICsgJy5vZmYgeycsXG4gICAgICAnbGlzdC1zdHlsZS1pbWFnZTogdXJsKCcsXG4gICAgICAgICdjaHJvbWU6Ly9jbGlxei9jb250ZW50L3N0YXRpYy9za2luL2ltYWdlcy9hdHJhY2svYW50aS10cmFja2luZy1vZmYuc3ZnJyxcbiAgICAgICcpOycsXG4gICAgJ30nLFxuICAgICcjJyArIHRiYi5pZCArICcgeycsXG4gICAgICAnbGlzdC1zdHlsZS1pbWFnZTogdXJsKCcsXG4gICAgICAgICdjaHJvbWU6Ly9jbGlxei9jb250ZW50L3N0YXRpYy9za2luL2ltYWdlcy9hdHJhY2svYW50aS10cmFja2luZy1vbi5zdmcnLFxuICAgICAgJyk7JyxcbiAgICAnfScsXG4gICAgJyMnICsgdGJiLnZpZXdJZCArICcsJyxcbiAgICAnIycgKyB0YmIudmlld0lkICsgJyA+IGlmcmFtZSB7JyxcbiAgICAgICd3aWR0aDogNDAwcHg7JyxcbiAgICAgICdvdmVyZmxvdzogaGlkZGVuICFpbXBvcnRhbnQ7JyxcbiAgICAnfSdcbiAgXTtcblxuICBzdHlsZVVSSSA9IFNlcnZpY2VzLmlvLm5ld1VSSShcbiAgICAgICdkYXRhOnRleHQvY3NzLCcgKyBlbmNvZGVVUklDb21wb25lbnQoc3R5bGUuam9pbignJykpLFxuICAgICAgbnVsbCxcbiAgICAgIG51bGxcbiAgKTtcblxuICB0YmIuY2xvc2VQb3B1cCA9IGZ1bmN0aW9uICh0YWJCcm93c2VyKSB7XG4gICAgdGhpcy5DdXN0b21pemFibGVVSS5oaWRlUGFuZWxGb3JOb2RlKFxuICAgICAgICB1dGlscy5nZXRXaW5kb3coKS5nQnJvd3Nlci5vd25lckRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHRiYi52aWV3SWQpXG4gICAgKTtcbiAgfS5iaW5kKHRoaXMpO1xufVxuXG5DbGlxelBvcHVwQnV0dG9uLnByb3RvdHlwZS51cGRhdGVWaWV3ID0gZnVuY3Rpb24gKHdpbiwgY2xpZW50SGVpZ2h0KSB7XG4gIHZhciBwYW5lbCA9IHdpbi5kb2N1bWVudC5nZXRFbGVtZW50QnlJZCh0aGlzLnRiYi52aWV3SWQpO1xuICB2YXIgaWZyYW1lID0gcGFuZWwucXVlcnlTZWxlY3RvcihcImlmcmFtZVwiKTtcblxuICAgIGZ1bmN0aW9uIHRvUHgocGl4ZWxzKSB7XG4gICAgICByZXR1cm4gcGl4ZWxzLnRvU3RyaW5nKCkgKyAncHgnO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uUG9wdXBSZWFkeSgpIHtcbiAgICAgIGlmICghaWZyYW1lIHx8ICFpZnJhbWUuY29udGVudERvY3VtZW50KSB7IHJldHVybjsgfVxuXG4gICAgICB2YXIgYm9keSA9IGlmcmFtZS5jb250ZW50RG9jdW1lbnQuYm9keTtcblxuICAgICAgaWZyYW1lLnN0eWxlLmhlaWdodCA9IHRvUHgoY2xpZW50SGVpZ2h0KTtcbiAgICAgIHBhbmVsLnN0eWxlLmhlaWdodCA9IHRvUHgoY2xpZW50SGVpZ2h0ICsgcGFuZWwuYm94T2JqZWN0LmhlaWdodCAtIHBhbmVsLmNsaWVudEhlaWdodCApO1xuICAgIH1cblxuICBvblBvcHVwUmVhZHkoKTtcbn1cblxuQ2xpcXpQb3B1cEJ1dHRvbi5wcm90b3R5cGUudXBkYXRlU3RhdGUgPSBmdW5jdGlvbiAod2luLCB0dXJuT24pIHtcbiAgaWYoIXdpbikgcmV0dXJuO1xuXG4gIHZhciBidXR0b24gPSB3aW4uZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodGhpcy50YmIuaWQpO1xuXG4gIC8vIGlmIGJ1dHRvbiBpcyBoaWRkZW4gdmlhICdjdXN0b21pemUnIG1lbnUsIGJ1dHRvbiB3aWxsIGJlIHVuZGVmaW5lZFxuICBpZiAoIWJ1dHRvbikgcmV0dXJuO1xuXG4gIGlmICh0dXJuT24pIHtcbiAgICBidXR0b24uY2xhc3NMaXN0LnJlbW92ZShcIm9mZlwiKTtcbiAgfSBlbHNlIHtcbiAgICBidXR0b24uY2xhc3NMaXN0LmFkZChcIm9mZlwiKTtcbiAgfVxufVxuXG5DbGlxelBvcHVwQnV0dG9uLnByb3RvdHlwZS5zZXRCYWRnZSA9IGZ1bmN0aW9uICh3aW4sIGJhZGdlVGV4dCkge1xuICB2YXIgYnV0dG9uID0gd2luLmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHRoaXMudGJiLmlkKTtcblxuICAvLyBpZiBidXR0b24gaXMgaGlkZGVuIHZpYSAnY3VzdG9taXplJyBtZW51LCBidXR0b24gd2lsbCBiZSB1bmRlZmluZWRcbiAgaWYgKCFidXR0b24pIHJldHVybjtcblxuICBpZiAoIGJhZGdlVGV4dCApIHtcbiAgICBidXR0b24uc2V0QXR0cmlidXRlKCdiYWRnZScsIFN0cmluZyhiYWRnZVRleHQpKTtcbiAgfSBlbHNlIHtcbiAgICBidXR0b24uc2V0QXR0cmlidXRlKCdiYWRnZScsICcnKTtcbiAgfVxuXG5cbiAgaWYgKCAhYnV0dG9uLmNsYXNzTGlzdC5jb250YWlucygnYmFkZ2VkLWJ1dHRvbicpICkge1xuICAgIGJ1dHRvbi5jbGFzc0xpc3QuYWRkKCdiYWRnZWQtYnV0dG9uJyk7XG4gIH1cblxuICBDbGlxelV0aWxzLnNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgIHZhciBiYWRnZSA9IGJ1dHRvbi5vd25lckRvY3VtZW50LmdldEFub255bW91c0VsZW1lbnRCeUF0dHJpYnV0ZShcbiAgICAgIGJ1dHRvbixcbiAgICAgICdjbGFzcycsXG4gICAgICAndG9vbGJhcmJ1dHRvbi1iYWRnZSdcbiAgICApO1xuXG4gICAgLy8gd2hlbiB3aW5kb3cgaXMgdG9vIHNtYWxsIHRvIGRpc3BsYXkgYWxsIGljb25zLCB0aGUgYW50aS10cmFja2luZyBiYWRnZVxuICAgIC8vIG1heSBiZSBoaWRkZW4gYmVoaW5kIGEgJz4+JyBidXR0b24uIEluIHRoaXMgY2FzZSwgYmFkZ2Ugd2lsbCBiZSBudWxsLlxuICAgIGlmKGJhZGdlKSB7XG4gICAgICBiYWRnZS5zdHlsZS5jc3NUZXh0ID0gJ2JhY2tncm91bmQtY29sb3I6ICM2NjY7IGNvbG9yOiAjZmZmOyc7XG4gICAgfVxuICB9LCAyNTApO1xufTtcblxuQ2xpcXpQb3B1cEJ1dHRvbi5wcm90b3R5cGUuYXR0YWNoID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLkN1c3RvbWl6YWJsZVVJLmNyZWF0ZVdpZGdldCh0aGlzLnRiYik7XG4gIHRoaXMuc2V0dXBDb21tdW5pY2F0aW9uQ2hhbm5lbCgpO1xufTtcblxuQ2xpcXpQb3B1cEJ1dHRvbi5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5DdXN0b21pemFibGVVSS5kZXN0cm95V2lkZ2V0KHRoaXMudGJiLmlkKTtcbn07XG5cbkNsaXF6UG9wdXBCdXR0b24ucHJvdG90eXBlLnNldHVwQ29tbXVuaWNhdGlvbkNoYW5uZWwgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBjaGFubmVsTmFtZSA9IHRoaXMubmFtZSxcbiAgICAgIGFjdGlvbnMgPSB0aGlzLmFjdGlvbnM7XG5cbiAgZnVuY3Rpb24gcG9wdXBNZXNzYWdlSGFuZGxlcihtc2cpIHtcbiAgICB2YXIgZnVuY3Rpb25OYW1lID0gbXNnLm1lc3NhZ2UuZnVuY3Rpb25OYW1lLFxuICAgICAgICBmdW5jdGlvbkFyZ3MgPSBtc2cubWVzc2FnZS5hcmdzLFxuICAgICAgICBoYW5kbGVyID0gYWN0aW9uc1tmdW5jdGlvbk5hbWVdO1xuXG4gICAgZnVuY3Rpb24gY2FsbGJhY2socmVzKSB7XG4gICAgICBDbGlxekV2ZW50cy5wdWIoY2hhbm5lbE5hbWUrXCItYmFja2dyb3VuZFwiLCB7XG4gICAgICAgIGlkOiBtc2cuaWQsXG4gICAgICAgIG1lc3NhZ2U6IHJlc1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKCFoYW5kbGVyKSB7IHJldHVybjsgfVxuXG4gICAgaGFuZGxlcihmdW5jdGlvbkFyZ3MsIGNhbGxiYWNrKTtcbiAgfVxuXG4gIENsaXF6RXZlbnRzLnN1YihjaGFubmVsTmFtZStcIi1wb3B1cFwiLCBwb3B1cE1lc3NhZ2VIYW5kbGVyKTtcbn07XG4iXX0=