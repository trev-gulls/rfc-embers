import Application from '@ember/application';
import Resolver from 'ember-resolver';
import loadInitializers from 'ember-load-initializers';
import config from './config/environment';
import GitHubRfcSource from './sources/github-rfc-source';

export default class App extends Application {
  modulePrefix = config.modulePrefix;
  podModulePrefix = config.podModulePrefix;
  Resolver = Resolver;
}

App.initializer({
  name: 'rfc-source',
  initialize(application) {
    application.register('source:rfc', new GitHubRfcSource(), {
      instantiate: false,
    });
  },
});

loadInitializers(App, config.modulePrefix);
