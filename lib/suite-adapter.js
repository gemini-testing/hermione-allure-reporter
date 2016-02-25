'use strict';

var _ = require('lodash'),
    inherit = require('inherit'),
    AllureTest = require('allure-js-commons').Test,
    mochaUtils = require('./mocha-utils'),
    writer = require('allure-js-commons').writer;

module.exports = inherit({
    __constructor: function(allureSuite, browser) {
        this.browser = browser;
        this.title = allureSuite.name;
        this._allureSuite = allureSuite;
        this.runningTests = [];
    },

    addTest: function(mochaTest) {
        var allureTest = new AllureTest(mochaUtils.cutTopSuiteTitle(mochaTest));
        allureTest.addParameter('environment-variable', 'browser', this.browser);
        allureTest.addParameter('environment-variable', 'sessionId', mochaTest.sessionId);
        this.runningTests.push(allureTest);
    },

    getRunningTest: function(mochaTest) {
        return _.find(this.runningTests, {name: mochaUtils.cutTopSuiteTitle(mochaTest)});
    },

    removeRunningTest: function(mochaTest) {
        _.remove(this.runningTests, {name: mochaUtils.cutTopSuiteTitle(mochaTest)});
    },

    finishTest: function(mochaTest, status, err) {
        var allureTest = this.getRunningTest(mochaTest);
        if (!allureTest) {
            return;
        }
        this.removeRunningTest(mochaTest);
        allureTest.end(status, err);
        this._allureSuite.addTest(allureTest);
    },

    endSuite: function(targetDir) {
        this._allureSuite.end();
        this._allureSuite.write(writer, targetDir);
    }
});
