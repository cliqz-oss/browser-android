'use strict';

let Promise = require('promise');

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
