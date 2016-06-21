'use strict';

let Promise = require('promise');
let wd = require('wd');

exports.dismissGoogleServicesDialog = function () {
  const resolveElementText = function(element) {
    return new Promise(function (resolve, reject) {
      element
        .text()
        .then((text) => {
          resolve({
            element: element,
            text: text
          });
        });
    });
  };
  let driver = this;
  return driver
    .elementsByClassName("android.widget.Button")
    .then((elements) => {
      const pr = elements.map((el) => resolveElementText(el));
      return Promise.all(pr);
    })
    .then((elements) => {
      elements.forEach((element) => {
        if ((element.text === 'Update') ||
          (element.text === 'Get Google Play services')) {
          return driver.back();
        }
      });
      return driver;
    })
};

exports.findWindowWithTitle = function (desiredTitle) {
  const driver = this;
  return driver
    .windowHandles()
      .then(function(handles) {
        return new Promise(function(resolve, reject) {
          let call = function() {
            if (handles.length == 0) {
              reject("Can't find " + desiredTitle + " window");
            } else {
              let handle = handles.pop();
              driver
                .window(handle)
                .title()
                  .then(function(title) {
                    if (title === desiredTitle) {
                      resolve(driver);
                    } else {
                      call();
                    }
                  });
            }
          }
          call();
        });
      });
};

exports.clearSearchBar = function () {
  const driver = this;
  const dimen =  {height: 0, width: 0};
  const loc = {x: 0, y: 0};
  return driver
    .elementByAccessibilityId("Search Bar")
      .click()
      .getSize()
        .then(function (dimensions) {
          dimen.height = dimensions.height;
          dimen.width = dimensions.width;
        })
    .elementByAccessibilityId("Search Bar")
      .getLocation()
        .then(function (location) {
          loc.x = location.x;
          loc.y = location.y;
        })
    .then(function () {
        var tapX = loc.x + dimen.width - 10;
        var tapY = loc.y + dimen.height/2;
        var touchAction = new wd.TouchAction(this);
        touchAction.tap({x:tapX, y:tapY});
        driver.performTouchAction(touchAction);
    })
    .elementByAccessibilityId("Search Bar");
};
