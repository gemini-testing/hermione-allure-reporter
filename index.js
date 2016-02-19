'use strict';

var AllureSuite = require('allure-js-commons').Suite,
    AllureTest = require('allure-js-commons').Test,
    writer = require('allure-js-commons').writer,
    mochaUtils = require('./lib/mochaUtils'),
    SuiteHolder = require('./lib/suite-holder'),
    ALLURE_STATUS = {
        passed: 'passed',
        failed: 'failed',
        pending: 'pending',
        broken: 'broken'
    },
    _suiteHolder,
    targetDir;

module.exports = function(hermione, opts) {
    _suiteHolder = new SuiteHolder();
    targetDir = opts.targetDir;
    hermione.on(hermione.events.SUITE_BEGIN, _onSuiteBegin);
    hermione.on(hermione.events.SUITE_END, _onSuiteEnd);
    hermione.on(hermione.events.TEST_BEGIN, _onTestBegin);
    hermione.on(hermione.events.TEST_PASS, _onTestPass);
    hermione.on(hermione.events.TEST_FAIL, _onTestFail);
    hermione.on(hermione.events.TEST_PENDING, _onTestPending);
    hermione.on(hermione.events.ERROR, _onError);
};

function _onSuiteBegin(suite) {
    if (!mochaUtils.isTopSuite(suite)) {
        return;
    }

    if (!_suiteHolder.getSuiteEntry(suite.title, suite.browserId)) {
        _suiteHolder.addSuiteEntry(new AllureSuite(suite.title), suite.browserId);
    }
}

function _onSuiteEnd(suite) {
    if (!mochaUtils.isTopSuite(suite)) {
        return;
    }
    var suiteEntry = _suiteHolder.getSuiteEntry(suite.title, suite.browserId);
    if (suiteEntry) {
        suiteEntry.allureSuite.end();
        suiteEntry.allureSuite.write(writer, targetDir);
        _suiteHolder.removeSuiteEntry(suite.title, suite.browserId);
    }
}

function _onTestBegin(test) {
    _suiteHolder.removeTest(test);
    _suiteHolder.startTest(test);
}

function _onTestPass(test) {
    _suiteHolder.finishTest(test, ALLURE_STATUS.passed);
}

function _onTestFail(test) {
    _suiteHolder.finishTest(test, ALLURE_STATUS.failed, test.err);
}

function _onTestPending(test) {
    var suiteEntry = _suiteHolder.getSuiteEntry(mochaUtils.getTopSuite(test).title, test.browserId),
        pendingTest = new AllureTest(mochaUtils.cutTopSuiteTitle(test));
    pendingTest.end(ALLURE_STATUS.pending, {message: 'Test ignored'});
    suiteEntry.allureSuite.addTest(pendingTest);
}

function _onError(err, data) {
    if (data) {
        if (mochaUtils.isBeforeHook(data)) {
            data.parent.suites.forEach(function(mochaSuite) {
                var allureSuite = new AllureSuite(mochaSuite.title);
                mochaUtils.getAllSuiteTests(mochaSuite).forEach(function(test) {
                    var brokenTest = new AllureTest(mochaUtils.cutTopSuiteTitle(test));
                    brokenTest.addParameter('environment-variable', 'browser', data.browserId);
                    brokenTest.end(ALLURE_STATUS.broken, err);
                    allureSuite.addTest(brokenTest);
                    allureSuite.end();
                    allureSuite.write(writer, targetDir);
                });
            });
        }
    }
}
