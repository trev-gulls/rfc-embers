'use strict';

module.exports = {
  extends: ['stylelint-config-standard', 'stylelint-prettier/recommended'],
  rules: {
    // Allow BEM modifier syntax (e.g. .block--modifier)
    'selector-class-pattern': [
      '^([a-z][a-z0-9]*)(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?$',
      { message: 'Expected BEM-style class name' },
    ],
  },
};
