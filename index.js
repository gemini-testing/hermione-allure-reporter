'use strict';

var AllureSuite = require('allure-js-commons/beans/suite'),
    mochaUtils = require('./lib/mocha-utils'),
    RunningSuites = require('./lib/running-suites'),
    SuiteAdapter = require('./lib/suite-adapter');

module.exports = function(hermione, opts) {
    if (opts.enabled === false) {
        return;
    }

    var ALLURE_STATUS = {
            passed: 'passed',
            failed: 'failed',
            pending: 'pending',
            broken: 'broken'
        },
        _runningSuites = new RunningSuites(),
        targetDir = opts.targetDir ? opts.targetDir : 'allure-results';

    hermione.config.getBrowserIds().forEach((id) => {
        const browserConfig = hermione.config.forBrowser(id);

        browserConfig.screenshotOnReject = true;
    });

    hermione.on(hermione.events.SUITE_BEGIN, function(suite) {
        if (!mochaUtils.isTopEntity(suite)) {
            return;
        }

        if (!_runningSuites.getSuite(suite.title, suite.browserId)) {
            _runningSuites.addSuite(new AllureSuite(suite.title), suite.browserId, targetDir);
        }
    });

    hermione.on(hermione.events.SUITE_END, function(suite) {
        if (!mochaUtils.isTopEntity(suite)) {
            return;
        }
        var runningSuite = _runningSuites.getSuite(suite.title, suite.browserId);
        if (runningSuite) {
            runningSuite.endSuite();
            _runningSuites.removeSuite(suite.title, suite.browserId);
        }
    });

    // handling of cases when `before all` hook fails
    hermione.on(hermione.events.SUITE_FAIL, function(fail) {
        var suiteAdapter = new SuiteAdapter(new AllureSuite(fail.parent.title), fail.browserId, targetDir);

        suiteAdapter.addTest(fail);
        suiteAdapter.finishTest(fail, ALLURE_STATUS.failed, fail.err);
        suiteAdapter.endSuite();
    });

    hermione.on(hermione.events.TEST_BEGIN, function(test) {
        _runningSuites.startTest(test);
    });

    hermione.on(hermione.events.TEST_PASS, function _onTestPass(test) {
        _runningSuites.finishTest(test, ALLURE_STATUS.passed);
    });

    hermione.on(hermione.events.TEST_FAIL, function(test) {
        _runningSuites.finishTest(test, ALLURE_STATUS.failed, test.err);
    });

    hermione.on(hermione.events.TEST_PENDING, function(test) {
        var runningSuite = _runningSuites.getSuiteByTest(test);
        runningSuite.addTest(test);

        const skipReason = mochaUtils.getSkipReason(test);
        const match = skipReason.match(/https?:\/\/[^\s]+/);
        const issue = match && match[0];

        runningSuite.finishTest(test, ALLURE_STATUS.pending,
            {message: `Test ignored: ${skipReason}`, issue});
    });
};
