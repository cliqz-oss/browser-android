import { AppRegistry } from 'react-native';
import setup from './setup';
import React from 'react';
import { startup, components } from 'browser-core';
import events from 'browser-core/build/modules/core/events';
import { openLink } from 'browser-core/build/modules/platform/browser-actions';

// set app global for debugging
const appStart = startup.then((app) => {
  app.prefs.set('logger.telemetry.level', 'debug');
  const mobileCardsBackground = app.modules['mobile-cards'].background;
  mobileCardsBackground.actions.openLink = async function (url, selection) {
    if (selection) {
      await this.search.action('reportSelection', selection, { contextId: undefined });
    }
    openLink(url, selection.query);
  }.bind(mobileCardsBackground);
  events.sub('urlbar:blur', () => {
    app.modules.search.background.actions.stopSearch({}, { contextId: undefined });
  });
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
