import Application from '@ember/application';
import Resolver from 'ember-resolver';
import loadInitializers from 'ember-load-initializers';
import config from './config/environment';
import GitHubRfcSource from './sources/github-rfc-source';

import setupInspector from "@embroider/legacy-inspector-support/ember-source-4.12";
import compatModules from "@embroider/virtual/compat-modules";

export default class App extends Application {
  modulePrefix = config.modulePrefix;
  Resolver = Resolver.withModules(compatModules);
  inspector = setupInspector(this);
}

App.initializer({
  name: 'rfc-source',
  initialize(application) {
    application.register('source:rfc', new GitHubRfcSource(), {
      instantiate: false,
    });
  },
});

loadInitializers(App, config.modulePrefix, compatModules);
