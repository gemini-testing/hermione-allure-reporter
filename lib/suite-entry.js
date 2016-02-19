'use strict';

var _ = require('lodash'),
    inherit = require('inherit');

module.exports = inherit({
    __constructor: function(allureSuite, browser) {
        this.browser = browser;
        this.title = allureSuite.name;
        this.allureSuite = allureSuite;
        this.runningTests = [];
    },

    addTest: function(allureTest) {
        this.runningTests.push(allureTest);
    },

    getTest: function(title) {
        return _.find(this.runningTests, {name: title});
    },

    removeTest: function(title) {
        _.remove(this.runningTests, {title: title});
    }
});
