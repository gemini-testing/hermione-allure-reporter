'use strict';

var _ = require('lodash'),
    inherit = require('inherit'),
    SuiteAdapter = require('./suite-adapter'),
    mochaUtils = require('./mocha-utils');

module.exports = inherit({
    __constructor: function() {
        this._suites = [];
    },

    addSuite: function(allureSuite, browser, outputDir) {
        this._suites.push(new SuiteAdapter(allureSuite, browser, outputDir));
    },

    getSuite: function(title, browser) {
        return _.find(this._suites, {title: title, browser: browser});
    },

    getSuiteByTest: function(mochaTest) {
        return this.getSuite(mochaUtils.getTopSuite(mochaTest).title, mochaTest.browserId);
    },

    removeSuite: function(title, browser) {
        _.remove(this._suites, {title: title, browser: browser});
    },

    removeTest: function(mochaTest) {
        var suite = this.getSuiteByTest(mochaTest);
        if (suite) {
            suite.removeTest(mochaTest);
        }
    },

    getTest: function(mochaTest) {
        var suite = this.getSuiteByTest(mochaTest);
        if (suite) {
            return suite.getTest(mochaTest);
        }
    },

    startTest: function(mochaTest) {
        this.removeTest(mochaTest);
        var suite = this.getSuiteByTest(mochaTest);
        if (suite) {
            suite.addTest(mochaTest);
        }
    },

    finishTest: function(mochaTest, status, err) {
        var suite = this.getSuiteByTest(mochaTest);
        if (suite) {
            suite.finishTest(mochaTest, status, err);
        }
    }
});
