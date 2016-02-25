'use strict';

var _ = require('lodash'),
    inherit = require('inherit'),
    SuiteAdapter = require('./suite-adapter'),
    mochaUtils = require('./mocha-utils');

module.exports = inherit({

    __constructor: function() {
        this._suites = [];
    },

    addRunningSuite: function(allureSuite, browser) {
        this._suites.push(new SuiteAdapter(allureSuite, browser));
    },

    getRunningSuite: function(title, browser) {
        return _.find(this._suites, {title: title, browser: browser});
    },

    getRunningSuiteByTest: function(mochaTest) {
        return this.getRunningSuite(mochaUtils.getTopSuite(mochaTest).title, mochaTest.browserId);
    },

    removeRunningSuite: function(title, browser) {
        _.remove(this._suites, {title: title, browser: browser});
    },

    removeRunningTest: function(mochaTest) {
        var runningSuite = this.getRunningSuiteByTest(mochaTest);
        if (runningSuite) {
            runningSuite.removeRunningTest(mochaTest);
        }
    },

    getRunningTest: function(mochaTest) {
        var runningSuite = this.getRunningSuiteByTest(mochaTest);
        if (runningSuite) {
            return runningSuite.getRunningTest(mochaTest);
        }
    },

    startTest: function(mochaTest) {
        this.removeRunningTest(mochaTest);
        var runningSuite = this.getRunningSuiteByTest(mochaTest);
        if (runningSuite) {
            runningSuite.addTest(mochaTest);
        }
    },

    finishTest: function(mochaTest, status, err) {
        var runningSuite = this.getRunningSuiteByTest(mochaTest);
        if (runningSuite) {
            runningSuite.finishTest(mochaTest, status, err);
        }
    }
});
