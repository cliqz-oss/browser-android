import { AppRegistry } from 'react-native';
import setup from './setup';
import React from 'react';
import { startup, components } from 'browser-core';
import { Offboarding } from './index-offboarding';

// set app global for debugging
const appStart = startup.then((app) => {
  global.app = app;
});

// register components from config
Object.keys(components).forEach((component) => {
  AppRegistry.registerComponent(component, () => class extends React.Component {
    render() {
      return React.createElement(components[component], { appStart });
    }
  });
});

AppRegistry.registerComponent('Offboarding', () => Offboarding);
