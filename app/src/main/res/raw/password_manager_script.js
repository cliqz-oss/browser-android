var usernameField, passwordField, targetForm, savedUsername = '', savedPassword = '', SECURE_CLIQZ = 'CLIQZ', SECURE_HASH = '%d';
var USERNAME_INPUT_TYPES = ['number', 'tel', 'text', 'email'];
var allForms = [];
(function fillFormsFromFrames(document) {
  allForms = allForms.concat([].slice.call(document.forms));
  var frames = document.querySelectorAll("frame,iframe");
  for (var i = 0; i < frames.length; i++) {
    fillFormsFromFrames(frames[i].contentDocument);
  }
})(document);

allForms.forEach(function(form) {
  var isFound = false;
  for(var i = 1; i < form.length; i++) {
    if(form.elements[i].type === 'password' && USERNAME_INPUT_TYPES.indexOf(form.elements[i - 1].type) >= 0) {
      usernameField = form.elements[i-1];
      passwordField = form.elements[i];
      isFound = true;
      var onsubmit = form.onsubmit && form.onsubmit.bind(form)
      var submit = form.submit && form.submit.bind(form)
      form.onsubmit = form.submit = sendLoginDetails(onsubmit, submit);
      sendRequest();
    }
    if (isFound && form.elements[i].type === 'button' && form.elements[i].name && form.elements[i].name.toLowerCase() === 'login' ) {
      form.elements[i].addEventListener('touchend', sendLoginDetails());
    }
  }
});

function fillLoginDetails (username, password) {
  usernameField.value = savedUsername = username;
  passwordField.value = savedPassword = password;
}

function sendLoginDetails (onsubmit, submit) {
  return function() {
    if(usernameField.value !== savedUsername || passwordField.value !== savedPassword) {
      sendRequest({
        username: usernameField.value,
        password: passwordField.value
      });
    }
    if (onsubmit) onsubmit();
    if (submit) submit();
  }
}

function sendRequest (params) {
  var target = window.location.origin + '/' + SECURE_CLIQZ + SECURE_HASH + '?domain=' + window.location.host;
  for (var key in params) {
    if (params.hasOwnProperty(key)) {
      target += '&' + key + '=' + params[key];
    }
  }
  var xhttp = new XMLHttpRequest();
  xhttp.open("GET", target, true);
  xhttp.setRequestHeader("url", window.location.hostname);
  xhttp.send();
}

