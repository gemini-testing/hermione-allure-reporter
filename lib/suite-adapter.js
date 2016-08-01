'use strict';

var _ = require('lodash'),
    inherit = require('inherit'),
    AllureTest = require('allure-js-commons/beans/test'),
    Attachment = require('allure-js-commons/beans/attachment'),
    mochaUtils = require('./mocha-utils'),
    writer = require('allure-js-commons/writer');

module.exports = inherit({
    __constructor: function(allureSuite, browser, outputDir) {
        this.browser = browser;
        this.title = allureSuite.name;
        this._allureSuite = allureSuite;
        this.runningTests = [];
        this._outputDir = outputDir;
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

        _.forEach(mochaTest.meta, (val, key) => {
            allureTest.addParameter('environment-variable', key, val);
        });

        if (err && err.screenshot) {
            var buffer = new Buffer(err.screenshot, 'base64'),
                name = writer.writeBuffer(this._outputDir, buffer, 'png'),
                attachment = new Attachment('Screenshot', name, buffer.length, 'image/png');

            allureTest.addAttachment(attachment);
        }

        this.removeTest(mochaTest);
        allureTest.end(status, err);
        this._allureSuite.addTest(allureTest);
    },

    endSuite: function() {
        this._allureSuite.end();
        writer.writeSuite(this._outputDir, this._allureSuite);
    }
});
