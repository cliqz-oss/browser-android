System.register("mobile-ui/views/local-data-sc", [], function (_export) {
  "use strict";

  var _default;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  return {
    setters: [],
    execute: function () {
      _default = (function () {
        function _default() {
          _classCallCheck(this, _default);
        }

        _createClass(_default, [{
          key: "enhanceResults",
          value: function enhanceResults(data) {

            function parseTime(timeStr) {
              // e.g. timeStr: 10.30
              var time = timeStr.split(".");
              return {
                hours: parseInt(time[0]) || 0,
                minutes: parseInt(time[1]) || 0
              };
            }

            function twoDigit(num) {
              return [num < 10 ? "0" : "", num].join("");
            }

            var isBigSnippet = Boolean(data.phonenumber || data.address || data.opening_hours || data.no_location),
                rating_img = null,
                t = new Date(),
                current_t = [twoDigit(t.getHours()), twoDigit(t.getMinutes())].join("."),
                open_stt,
                timeInfos = [],
                openingColors = {
              open: "#74d463",
              closed: "#E92207",
              open_soon: "#FFC802",
              close_soon: "#FFC802"
            };

            data.phone_address = data.phonenumber || data.address;

            if (data.opening_hours) {

              data.opening_hours.forEach(function (el) {
                if (!el.open || !el.close) {
                  return;
                }
                timeInfos.push(el.open.time + " - " + el.close.time);
                if (open_stt && open_stt !== "closed") {
                  return;
                }

                var openTime = parseTime(el.open.time),
                    closeTime = parseTime(el.close.time),
                    closesNextDay = el.close.day !== el.open.day,

                /** Difference in minutes from opening/closing times to current time **/
                minutesFrom = {
                  opening: 60 * (t.getHours() - openTime.hours) + (t.getMinutes() - openTime.minutes),
                  /* If it closes the next day, we need to subtract 24 hours from the hour difference */
                  closing: 60 * (t.getHours() - closeTime.hours - (closesNextDay ? 24 : 0)) + (t.getMinutes() - closeTime.minutes)
                };

                if (minutesFrom.opening > 0 && minutesFrom.closing < 0) {
                  open_stt = "open";
                  if (minutesFrom.closing > -60) {
                    open_stt = "close_soon";
                  }
                } else {
                  open_stt = "closed";
                  if (minutesFrom.opening > -60 && minutesFrom.opening < 0) {
                    open_stt = "open_soon";
                  }
                }
              });

              data.opening_status = {
                color: openingColors[open_stt],
                stt_text: open_stt && CliqzUtils.getLocalizedString(open_stt),
                time_info_til: CliqzUtils.getLocalizedString("open_hour"),
                time_info_str: timeInfos.join(", ")
              };
            }

            if (!data.rating) {
              data.rating = 0;
            }

            rating_img = "http://cdn.cliqz.com/extension/EZ/richresult/stars" + Math.max(0, Math.min(Math.round(data.rating), 5)) + ".svg";

            if (!isBigSnippet) {
              data.richData = {
                image: data.image,
                url_ratingimg: rating_img,
                name: data.t,
                des: data.desc
              };
            } else {
              data.url_ratingimg = rating_img;
            }

            data.big_rs_size = isBigSnippet;

            data.distance = CLIQZEnvironment.distance(data.lon, data.lat, CLIQZEnvironment.USER_LNG, CLIQZEnvironment.USER_LAT) * 1000;

            data.deepLinks = ((data.deepResults || []).find(function (res) {
              return res.type === 'buttons';
            }) || {}).links;
          }
        }]);

        return _default;
      })();

      _export("default", _default);

      ;
    }
  };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vYmlsZS11aS92aWV3cy9sb2NhbC1kYXRhLXNjLmVzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7aUJBQ2dCLHdCQUFDLElBQUksRUFBRTs7QUFFbkIscUJBQVMsU0FBUyxDQUFDLE9BQU8sRUFBRTs7QUFDMUIsa0JBQUksSUFBSSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDOUIscUJBQU87QUFDTCxxQkFBSyxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQzdCLHVCQUFPLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7ZUFDaEMsQ0FBQzthQUNIOztBQUVELHFCQUFTLFFBQVEsQ0FBQyxHQUFHLEVBQUU7QUFDckIscUJBQU8sQ0FDTCxHQUFHLEdBQUcsRUFBRSxHQUFHLEdBQUcsR0FBRyxFQUFFLEVBQ25CLEdBQUcsQ0FDSixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQzthQUNaOztBQUVELGdCQUFJLFlBQVksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLFdBQVcsSUFBSSxJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxhQUFhLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQztnQkFDbEcsVUFBVSxHQUFHLElBQUk7Z0JBQ2pCLENBQUMsR0FBRyxJQUFJLElBQUksRUFBRTtnQkFDZCxTQUFTLEdBQUcsQ0FDVixRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQ3RCLFFBQVEsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FDekIsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO2dCQUNYLFFBQVE7Z0JBQUUsU0FBUyxHQUFHLEVBQUU7Z0JBQ3hCLGFBQWEsR0FBSTtBQUNmLGtCQUFJLEVBQUUsU0FBUztBQUNmLG9CQUFNLEVBQUUsU0FBUztBQUNqQix1QkFBUyxFQUFFLFNBQVM7QUFDcEIsd0JBQVUsRUFBRSxTQUFTO2FBQ3RCLENBQUM7O0FBRU4sZ0JBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLFdBQVcsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDOztBQUV0RCxnQkFBSSxJQUFJLENBQUMsYUFBYSxFQUFFOztBQUV0QixrQkFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLEVBQUU7QUFDdkMsb0JBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRTtBQUFFLHlCQUFPO2lCQUFFO0FBQ3RDLHlCQUFTLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3JELG9CQUFHLFFBQVEsSUFBSSxRQUFRLEtBQUssUUFBUSxFQUFFO0FBQUUseUJBQU87aUJBQUU7O0FBR2pELG9CQUFJLFFBQVEsR0FBSSxTQUFTLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7b0JBQ3ZDLFNBQVMsR0FBRyxTQUFTLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUM7b0JBQ3BDLGFBQWEsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsS0FBSyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUc7OztBQUU1QywyQkFBVyxHQUFHO0FBQ1oseUJBQU8sRUFBRyxFQUFFLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUEsQUFBQyxJQUFJLENBQUMsQ0FBQyxVQUFVLEVBQUUsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFBLEFBQUM7O0FBRXBGLHlCQUFPLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxRQUFRLEVBQUUsR0FBRyxTQUFTLENBQUMsS0FBSyxJQUFLLGFBQWEsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFBLENBQUMsQUFBRSxJQUFJLENBQUMsQ0FBQyxVQUFVLEVBQUUsR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFBLEFBQUM7aUJBQ25ILENBQUM7O0FBRUYsb0JBQUksV0FBVyxDQUFDLE9BQU8sR0FBRyxDQUFDLElBQUksV0FBVyxDQUFDLE9BQU8sR0FBRyxDQUFDLEVBQUU7QUFDdEQsMEJBQVEsR0FBRyxNQUFNLENBQUM7QUFDbEIsc0JBQUksV0FBVyxDQUFDLE9BQU8sR0FBRyxDQUFDLEVBQUUsRUFBQztBQUM1Qiw0QkFBUSxHQUFJLFlBQVksQ0FBQzttQkFDMUI7aUJBQ0YsTUFBTTtBQUNMLDBCQUFRLEdBQUcsUUFBUSxDQUFDO0FBQ3BCLHNCQUFJLFdBQVcsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxFQUFFLElBQUksV0FBVyxDQUFDLE9BQU8sR0FBRyxDQUFDLEVBQUU7QUFDeEQsNEJBQVEsR0FBRyxXQUFXLENBQUM7bUJBQ3hCO2lCQUNGO2VBQ0YsQ0FBQyxDQUFDOztBQUdILGtCQUFJLENBQUMsY0FBYyxHQUFHO0FBQ3BCLHFCQUFLLEVBQUUsYUFBYSxDQUFDLFFBQVEsQ0FBQztBQUM5Qix3QkFBUSxFQUFFLFFBQVEsSUFBSSxVQUFVLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDO0FBQzdELDZCQUFhLEVBQUUsVUFBVSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsQ0FBQztBQUN6RCw2QkFBYSxFQUFFLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO2VBQ3BDLENBQUM7YUFDSDs7QUFFRCxnQkFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7QUFBRSxrQkFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7YUFBRTs7QUFFdEMsc0JBQVUsR0FBRyxvREFBb0QsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDOztBQUUvSCxnQkFBSSxDQUFDLFlBQVksRUFBRTtBQUNqQixrQkFBSSxDQUFDLFFBQVEsR0FBRztBQUNkLHFCQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7QUFDakIsNkJBQWEsRUFBRSxVQUFVO0FBQ3pCLG9CQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDWixtQkFBRyxFQUFFLElBQUksQ0FBQyxJQUFJO2VBQ2YsQ0FBQzthQUNILE1BQU07QUFDTCxrQkFBSSxDQUFDLGFBQWEsR0FBRyxVQUFVLENBQUM7YUFDakM7O0FBR0QsZ0JBQUksQ0FBQyxXQUFXLEdBQUcsWUFBWSxDQUFDOztBQUVoQyxnQkFBSSxDQUFDLFFBQVEsR0FBRyxnQkFBZ0IsQ0FBQyxRQUFRLENBQ3JCLElBQUksQ0FBQyxHQUFHLEVBQ1IsSUFBSSxDQUFDLEdBQUcsRUFDVixnQkFBZ0IsQ0FBQyxRQUFRLEVBQ3pCLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxHQUFDLElBQUksQ0FBQzs7QUFFbEQsZ0JBQUksQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLElBQUksRUFBRSxDQUFBLENBQUUsSUFBSSxDQUFDLFVBQUEsR0FBRztxQkFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLFNBQVM7YUFBQSxDQUFDLElBQUksRUFBRSxDQUFBLENBQUUsS0FBSyxDQUFBO1dBQzVGOzs7Ozs7OztBQUNGLE9BQUMiLCJmaWxlIjoibW9iaWxlLXVpL3ZpZXdzL2xvY2FsLWRhdGEtc2MuZXMiLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgZGVmYXVsdCBjbGFzcyB7XG4gIGVuaGFuY2VSZXN1bHRzKGRhdGEpIHtcblxuICAgIGZ1bmN0aW9uIHBhcnNlVGltZSh0aW1lU3RyKSB7ICAvLyBlLmcuIHRpbWVTdHI6IDEwLjMwXG4gICAgICB2YXIgdGltZSA9IHRpbWVTdHIuc3BsaXQoXCIuXCIpO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgaG91cnM6IHBhcnNlSW50KHRpbWVbMF0pIHx8IDAsXG4gICAgICAgIG1pbnV0ZXM6IHBhcnNlSW50KHRpbWVbMV0pIHx8IDBcbiAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdHdvRGlnaXQobnVtKSB7XG4gICAgICByZXR1cm4gW1xuICAgICAgICBudW0gPCAxMCA/IFwiMFwiIDogXCJcIixcbiAgICAgICAgbnVtXG4gICAgICBdLmpvaW4oXCJcIik7XG4gICAgfVxuXG4gICAgdmFyIGlzQmlnU25pcHBldCA9IEJvb2xlYW4oZGF0YS5waG9uZW51bWJlciB8fCBkYXRhLmFkZHJlc3MgfHwgZGF0YS5vcGVuaW5nX2hvdXJzIHx8IGRhdGEubm9fbG9jYXRpb24pLFxuICAgICAgICByYXRpbmdfaW1nID0gbnVsbCxcbiAgICAgICAgdCA9IG5ldyBEYXRlKCksXG4gICAgICAgIGN1cnJlbnRfdCA9IFtcbiAgICAgICAgICB0d29EaWdpdCh0LmdldEhvdXJzKCkpLFxuICAgICAgICAgIHR3b0RpZ2l0KHQuZ2V0TWludXRlcygpKVxuICAgICAgICBdLmpvaW4oXCIuXCIpLFxuICAgICAgICBvcGVuX3N0dCwgdGltZUluZm9zID0gW10sXG4gICAgICAgIG9wZW5pbmdDb2xvcnMgPSAge1xuICAgICAgICAgIG9wZW46IFwiIzc0ZDQ2M1wiLFxuICAgICAgICAgIGNsb3NlZDogXCIjRTkyMjA3XCIsXG4gICAgICAgICAgb3Blbl9zb29uOiBcIiNGRkM4MDJcIixcbiAgICAgICAgICBjbG9zZV9zb29uOiBcIiNGRkM4MDJcIlxuICAgICAgICB9O1xuXG4gICAgZGF0YS5waG9uZV9hZGRyZXNzID0gZGF0YS5waG9uZW51bWJlciB8fCBkYXRhLmFkZHJlc3M7XG5cbiAgICBpZiAoZGF0YS5vcGVuaW5nX2hvdXJzKSB7XG5cbiAgICAgIGRhdGEub3BlbmluZ19ob3Vycy5mb3JFYWNoKGZ1bmN0aW9uIChlbCkge1xuICAgICAgICBpZiAoIWVsLm9wZW4gfHwgIWVsLmNsb3NlKSB7IHJldHVybjsgfVxuICAgICAgICB0aW1lSW5mb3MucHVzaChlbC5vcGVuLnRpbWUgKyBcIiAtIFwiICsgZWwuY2xvc2UudGltZSk7XG4gICAgICAgIGlmKG9wZW5fc3R0ICYmIG9wZW5fc3R0ICE9PSBcImNsb3NlZFwiKSB7IHJldHVybjsgfVxuXG5cbiAgICAgICAgdmFyIG9wZW5UaW1lICA9IHBhcnNlVGltZShlbC5vcGVuLnRpbWUpLFxuICAgICAgICBjbG9zZVRpbWUgPSBwYXJzZVRpbWUoZWwuY2xvc2UudGltZSksXG4gICAgICAgIGNsb3Nlc05leHREYXkgPSBlbC5jbG9zZS5kYXkgIT09IGVsLm9wZW4uZGF5LFxuICAgICAgICAvKiogRGlmZmVyZW5jZSBpbiBtaW51dGVzIGZyb20gb3BlbmluZy9jbG9zaW5nIHRpbWVzIHRvIGN1cnJlbnQgdGltZSAqKi9cbiAgICAgICAgbWludXRlc0Zyb20gPSB7XG4gICAgICAgICAgb3BlbmluZzogIDYwICogKHQuZ2V0SG91cnMoKSAtIG9wZW5UaW1lLmhvdXJzKSArICh0LmdldE1pbnV0ZXMoKSAtIG9wZW5UaW1lLm1pbnV0ZXMpLFxuICAgICAgICAgIC8qIElmIGl0IGNsb3NlcyB0aGUgbmV4dCBkYXksIHdlIG5lZWQgdG8gc3VidHJhY3QgMjQgaG91cnMgZnJvbSB0aGUgaG91ciBkaWZmZXJlbmNlICovXG4gICAgICAgICAgY2xvc2luZzogNjAgKiAodC5nZXRIb3VycygpIC0gY2xvc2VUaW1lLmhvdXJzIC0gKCBjbG9zZXNOZXh0RGF5ID8gMjQgOiAwKSApICsgKHQuZ2V0TWludXRlcygpIC0gY2xvc2VUaW1lLm1pbnV0ZXMpXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKG1pbnV0ZXNGcm9tLm9wZW5pbmcgPiAwICYmIG1pbnV0ZXNGcm9tLmNsb3NpbmcgPCAwKSB7XG4gICAgICAgICAgb3Blbl9zdHQgPSBcIm9wZW5cIjtcbiAgICAgICAgICBpZiAobWludXRlc0Zyb20uY2xvc2luZyA+IC02MCl7XG4gICAgICAgICAgICBvcGVuX3N0dCA9ICBcImNsb3NlX3Nvb25cIjtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb3Blbl9zdHQgPSBcImNsb3NlZFwiO1xuICAgICAgICAgIGlmIChtaW51dGVzRnJvbS5vcGVuaW5nID4gLTYwICYmIG1pbnV0ZXNGcm9tLm9wZW5pbmcgPCAwKSB7XG4gICAgICAgICAgICBvcGVuX3N0dCA9IFwib3Blbl9zb29uXCI7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcblxuXG4gICAgICBkYXRhLm9wZW5pbmdfc3RhdHVzID0ge1xuICAgICAgICBjb2xvcjogb3BlbmluZ0NvbG9yc1tvcGVuX3N0dF0sXG4gICAgICAgIHN0dF90ZXh0OiBvcGVuX3N0dCAmJiBDbGlxelV0aWxzLmdldExvY2FsaXplZFN0cmluZyhvcGVuX3N0dCksXG4gICAgICAgIHRpbWVfaW5mb190aWw6IENsaXF6VXRpbHMuZ2V0TG9jYWxpemVkU3RyaW5nKFwib3Blbl9ob3VyXCIpLFxuICAgICAgICB0aW1lX2luZm9fc3RyOiB0aW1lSW5mb3Muam9pbihcIiwgXCIpXG4gICAgICB9O1xuICAgIH1cblxuICAgIGlmICghZGF0YS5yYXRpbmcpIHsgZGF0YS5yYXRpbmcgPSAwOyB9XG5cbiAgICByYXRpbmdfaW1nID0gXCJodHRwOi8vY2RuLmNsaXF6LmNvbS9leHRlbnNpb24vRVovcmljaHJlc3VsdC9zdGFyc1wiICsgTWF0aC5tYXgoMCwgTWF0aC5taW4oTWF0aC5yb3VuZChkYXRhLnJhdGluZyksIDUpKSArIFwiLnN2Z1wiO1xuXG4gICAgaWYgKCFpc0JpZ1NuaXBwZXQpIHtcbiAgICAgIGRhdGEucmljaERhdGEgPSB7XG4gICAgICAgIGltYWdlOiBkYXRhLmltYWdlLFxuICAgICAgICB1cmxfcmF0aW5naW1nOiByYXRpbmdfaW1nLFxuICAgICAgICBuYW1lOiBkYXRhLnQsXG4gICAgICAgIGRlczogZGF0YS5kZXNjXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBkYXRhLnVybF9yYXRpbmdpbWcgPSByYXRpbmdfaW1nO1xuICAgIH1cblxuXG4gICAgZGF0YS5iaWdfcnNfc2l6ZSA9IGlzQmlnU25pcHBldDtcblxuICAgIGRhdGEuZGlzdGFuY2UgPSBDTElRWkVudmlyb25tZW50LmRpc3RhbmNlKFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5sb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhLmxhdCxcbiAgICAgICAgICAgICAgICAgICAgICBDTElRWkVudmlyb25tZW50LlVTRVJfTE5HLFxuICAgICAgICAgICAgICAgICAgICAgIENMSVFaRW52aXJvbm1lbnQuVVNFUl9MQVQpKjEwMDA7XG5cbiAgICBkYXRhLmRlZXBMaW5rcyA9ICgoZGF0YS5kZWVwUmVzdWx0cyB8fCBbXSkuZmluZChyZXMgPT4gcmVzLnR5cGUgPT09ICdidXR0b25zJykgfHwge30pLmxpbmtzXG4gIH1cbn07XG4iXX0=