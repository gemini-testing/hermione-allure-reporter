'use strict';

var AllureSuite = require('allure-js-commons/beans/suite'),
    mochaUtils = require('./lib/mocha-utils'),
    RunningSuites = require('./lib/running-suites'),
    SuiteAdapter = require('./lib/suite-adapter');

module.exports = function(hermione, opts) {
    var ALLURE_STATUS = {
            passed: 'passed',
            failed: 'failed',
            pending: 'pending',
            broken: 'broken'
        },
        _runningSuites = new RunningSuites(),
        targetDir = opts.targetDir ? opts.targetDir : 'allure-results';

    hermione.on(hermione.events.SUITE_BEGIN, function(suite) {
        if (!mochaUtils.isTopEntity(suite)) {
            return;
        }

        if (!_runningSuites.getSuite(suite.title, suite.browserId)) {
            _runningSuites.addSuite(new AllureSuite(suite.title), suite.browserId);
        }
    });

    hermione.on(hermione.events.SUITE_END, function(suite) {
        if (!mochaUtils.isTopEntity(suite)) {
            return;
        }
        var runningSuite = _runningSuites.getSuite(suite.title, suite.browserId);
        if (runningSuite) {
            runningSuite.endSuite(targetDir);
            _runningSuites.removeSuite(suite.title, suite.browserId);
        }
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
        runningSuite.finishTest(test, ALLURE_STATUS.pending, {message: 'Test ignored'});
    });

    hermione.on(hermione.events.ERROR, function(err, data) {
        var breakSuite = function(mochaSuite) {
            var suiteAdapter = new SuiteAdapter(new AllureSuite(mochaSuite.title), data.browserId);
            mochaUtils.getAllSuiteTests(mochaSuite).forEach(function(test) {
                suiteAdapter.addTest(test);
                suiteAdapter.finishTest(test, ALLURE_STATUS.broken, err);
            });
            suiteAdapter.endSuite(targetDir);
        };

        if (data && mochaUtils.isBeforeHook(data)) {
            if (mochaUtils.isTopEntity(data)) {
                data.parent.suites.forEach(breakSuite);
            } else {
                breakSuite(data.parent);
            }
        }
    });
};

