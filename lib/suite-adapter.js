'use strict';

var _ = require('lodash'),
    inherit = require('inherit'),
    AllureTest = require('allure-js-commons/beans/test'),
    mochaUtils = require('./mocha-utils'),
    writer = require('allure-js-commons/writer');

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

    getTest: function(mochaTest) {
        return _.find(this.runningTests, {name: mochaUtils.cutTopSuiteTitle(mochaTest)});
    },

    removeTest: function(mochaTest) {
        _.remove(this.runningTests, {name: mochaUtils.cutTopSuiteTitle(mochaTest)});
    },

    finishTest: function(mochaTest, status, err) {
        var allureTest = this.getTest(mochaTest);
        if (!allureTest) {
            return;
        }
        this.removeTest(mochaTest);
        allureTest.end(status, err);
        this._allureSuite.addTest(allureTest);
    },

    endSuite: function(targetDir) {
        this._allureSuite.end();
        writer.writeSuite(targetDir, this._allureSuite);
    }
});
