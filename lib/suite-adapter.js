'use strict';

const path = require('path');
const _ = require('lodash');
const AllureTest = require('allure-js-commons/beans/test');
const Attachment = require('allure-js-commons/beans/attachment');
const mochaUtils = require('./mocha-utils');
const writer = require('allure-js-commons/writer');

module.exports = class SuiteAdapter {
    constructor(allureSuite, browser, outputDir) {
        this.browser = browser;
        this.title = allureSuite.name;
        this._allureSuite = allureSuite;
        this.runningTests = [];
        this._outputDir = outputDir;
    }

    addTest(mochaTest) {
        const allureTest = new AllureTest(mochaUtils.cutTopSuiteTitle(mochaTest));
        const filePath = mochaTest.file
            ? path.relative(process.cwd(), mochaTest.file)
            : 'undefined path';

        allureTest.addParameter('environment-variable', 'file', filePath);
        allureTest.addParameter('environment-variable', 'browser', this.browser);
        allureTest.addParameter('environment-variable', 'sessionId', mochaTest.sessionId);
        this.runningTests.push(allureTest);
    }

    getTest(mochaTest) {
        return _.find(this.runningTests, {name: mochaUtils.cutTopSuiteTitle(mochaTest)});
    }

    removeTest(mochaTest) {
        _.remove(this.runningTests, {name: mochaUtils.cutTopSuiteTitle(mochaTest)});
    }

    finishTest(mochaTest, status, err) {
        const allureTest = this.getTest(mochaTest);

        if (!allureTest) {
            return;
        }

        _.forEach(mochaTest.meta, (val, key) => {
            if (key === 'testId') {
                allureTest.addLabel('testId', val);
            } else {
                allureTest.addParameter('environment-variable', key, val);
            }
        });

        if (err && err.issue) {
            allureTest.addLabel('issue', err.issue);
        }

        if (err && err.screenshot) {
            const buffer = new Buffer(err.screenshot, 'base64');
            const name = writer.writeBuffer(this._outputDir, buffer, 'png');
            const attachment = new Attachment('Screenshot', name, buffer.length, 'image/png');

            allureTest.addAttachment(attachment);
        }

        this.removeTest(mochaTest);
        allureTest.end(status, err);
        this._allureSuite.addTest(allureTest);
    }

    endSuite() {
        this._allureSuite.end();
        writer.writeSuite(this._outputDir, this._allureSuite);
    }
};
