'use strict';

var _ = require('lodash'),
    inherit = require('inherit'),
    AllureTest = require('allure-js-commons').Test,
    SuiteEntry = require('./suite-entry'),
    mochaUtils = require('./mochaUtils');

module.exports = inherit({

    __constructor: function() {
        this._entrySet = [];
    },

    addSuiteEntry: function(allureSuite, browser) {
        this._entrySet.push(new SuiteEntry(allureSuite, browser));
    },

    getSuiteEntry: function(title, browser) {
        return _.find(this._entrySet, {title: title, browser: browser});
    },

    removeSuiteEntry: function(title, browser) {
        _.remove(this._entrySet, {title: title, browser: browser});
    },

    removeTest: function(mochaTest) {
        var suiteEntry = this.getSuiteEntry(mochaUtils.getTopSuite(mochaTest).title, mochaTest.browserId);
        if (suiteEntry) {
            suiteEntry.removeTest(mochaTest.fullTitle());
        }
    },

    getTest: function(mochaTest) {
        var suiteEntry = this.getSuiteEntry(mochaUtils.getTopSuite(mochaTest).title, mochaTest.browserId);
        if (suiteEntry) {
            return suiteEntry.getTest(mochaTest.fullTitle());
        }
    },

    startTest: function(mochaTest) {
        var allureTest = new AllureTest(mochaTest.fullTitle());
        allureTest.addParameter('environment-variable', 'browser', mochaTest.browserId);
        allureTest.addParameter('environment-variable', 'sessionId', mochaTest.sessionId);
        var suiteEntry = this.getSuiteEntry(mochaUtils.getTopSuite(mochaTest).title, mochaTest.browserId);
        if (suiteEntry) {
            suiteEntry.addTest(allureTest);
        }
    },

    finishTest: function(mochaTest, status, err) {
        var suiteEntry = this.getSuiteEntry(mochaUtils.getTopSuite(mochaTest).title, mochaTest.browserId);
        if (suiteEntry) {
            var allureTest = suiteEntry.getTest(mochaTest.fullTitle());
            if (!allureTest) {
                return;
            }
            suiteEntry.removeTest(mochaTest.fullTitle());
            allureTest.name = mochaUtils.cutTopSuiteTitle(mochaTest);
            allureTest.end(status, err);
            suiteEntry.allureSuite.addTest(allureTest);
        }
    }
});
