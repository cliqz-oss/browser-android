var usernameField, passwordField, targetForm, savedUsername = '', savedPassword = '', SECURE_CLIQZ = 'CLIQZ', SECURE_HASH = '%d';
var USERNAME_INPUT_TYPES = ['number', 'tel', 'text', 'email'];
var allForms = [];
(function fillFormsFromFrames(document) {
  allForms = allForms.concat([].slice.call(document.forms));
  var frames = document.querySelectorAll("frame,iframe");
  for (var i = 0; i < frames.length; i++) {
    try {
        fillFormsFromFrames(frames[i].contentDocument);
    } catch (e) { /* cross origin */ }
  }
})(document);

var loginForms = [];

allForms.forEach(function(form) {
  for(var i = 1; i < form.length; i++) {
    if(form.elements[i].type === 'password' && USERNAME_INPUT_TYPES.indexOf(form.elements[i - 1].type) >= 0) {
      loginForms.push({
        form: form,
        usernameField: form.elements[i-1],
        passwordField: form.elements[i],
      });
      break;
    }
  }
});

if (loginForms.length) {
  sendRequest();
}

loginForms.forEach(function(item) {
  var form = item.form;
  var onsubmit = form.onsubmit && form.onsubmit.bind(form)
  var submit = form.submit && form.submit.bind(form)
  form.onsubmit = form.submit = sendLoginDetails(item.usernameField, item.passwordField, onsubmit, submit);
  for(var i = 1; i < form.length; i++) {
    if (form.elements[i].type === 'button' && form.elements[i].name && form.elements[i].name.toLowerCase() === 'login' ) {
      form.elements[i].addEventListener('touchend', sendLoginDetails(item.usernameField, item.passwordField));
    }
  }
});

function fillLoginDetails (username, password) {
  savedUsername = username;
  savedPassword = password;
  loginForms.forEach(function(form) {
    form.usernameField.value = username;
    form.passwordField.value = password;
  });
}

function sendLoginDetails (usernameField, passwordField, onsubmit, submit) {
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
  var target = window.location.origin + '/' + SECURE_CLIQZ + SECURE_HASH;
  var paramsString = '';
  for (var key in params) {
    if (params.hasOwnProperty(key)) {
      paramsString += '&' + key + '=' + params[key];
    }
  }
  target += paramsString.replace('&', '?');
  var xhttp = new XMLHttpRequest();
  xhttp.open("GET", target, true);
  xhttp.setRequestHeader("url", window.location.hostname);
  xhttp.send();
}
