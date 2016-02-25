'use strict';

var allureReporter = require('../index'),
    EventEmitter = require('events').EventEmitter,
    MochaSuite = require('mocha/lib/suite'),
    MochaTest = require('mocha/lib/test'),
    MochaHook = require('mocha/lib/hook'),
    AllureSuite = require('allure-js-commons').Suite,
    suites = [],
    mochaTest,
    rootSuite,
    mochaTestSuite,
    beforeHook,
    mochaTest2,
    topSuite,
    rootSuite2,
    underlyingSuite;

describe('Allure reporter', function() {
    var sandbox = sinon.sandbox.create(),
        hermione = new EventEmitter();

    hermione.events = require('hermione/lib/constants/runner-events');
    allureReporter(hermione, {targetDir: 'allure-results'});

    before(function() {
        mochaTest = new MochaTest('test', function() {});
        rootSuite = new MochaSuite('');
        mochaTestSuite = MochaSuite.create(rootSuite, 'suite');
        beforeHook = new MochaHook('before hook', function() {});
        mochaTest2 = new MochaTest('test2', function() {});
        topSuite = MochaSuite.create(rootSuite, 'topSuite');
        rootSuite2 = new MochaSuite('');
        underlyingSuite = MochaSuite.create(topSuite, 'suite2');

        sandbox.stub(AllureSuite.prototype, 'write', function() {
            suites.push(this);
        });

        mochaTestSuite.parent = rootSuite;
        mochaTestSuite.tests.push(mochaTest);
        mochaTest.parent = mochaTestSuite;
        beforeHook.parent = mochaTestSuite;

        mochaTest2.parent = underlyingSuite;
        underlyingSuite.parent = topSuite;
        topSuite.parent = rootSuite2;
    });

    beforeEach(function() {
        suites = [];
    });

    describe('suite', function() {
        it('should be saved with one test with correct names', function() {
            hermione.emit(hermione.events.SUITE_BEGIN, mochaTestSuite);
            hermione.emit(hermione.events.TEST_BEGIN, mochaTest);
            hermione.emit(hermione.events.TEST_PASS, mochaTest);
            hermione.emit(hermione.events.SUITE_END, mochaTestSuite);
            commonCaseVerification();
            assert.equal(suites[0].testcases[0].status, 'passed', 'test should be passed');
        });

        it('should be saved one test with correct names when it fails', function() {
            hermione.emit(hermione.events.SUITE_BEGIN, mochaTestSuite);
            hermione.emit(hermione.events.TEST_BEGIN, mochaTest);
            hermione.emit(hermione.events.TEST_FAIL, mochaTest);
            hermione.emit(hermione.events.SUITE_END, mochaTestSuite);
            commonCaseVerification();
            assert.equal(suites[0].testcases[0].status, 'failed', 'test should be failed');
        });

        it('should not be duplicated on calling SUITE_BEGIN twice', function() {
            hermione.emit(hermione.events.SUITE_BEGIN, mochaTestSuite);
            hermione.emit(hermione.events.SUITE_BEGIN, mochaTestSuite);
            hermione.emit(hermione.events.SUITE_END, mochaTestSuite);
            assert.lengthOf(suites, 1, '1 suite should be saved');
        });

        it('should not be duplicated on calling SUITE_END twice', function() {
            hermione.emit(hermione.events.SUITE_BEGIN, mochaTestSuite);
            hermione.emit(hermione.events.SUITE_END, mochaTestSuite);
            hermione.emit(hermione.events.SUITE_END, mochaTestSuite);
            assert.lengthOf(suites, 1, '1 suite should be saved');
        });

        it('should be ignored if it is not top', function() {
            hermione.emit(hermione.events.SUITE_BEGIN, underlyingSuite);
            hermione.emit(hermione.events.SUITE_END, underlyingSuite);
            assert.lengthOf(suites, 0);
        });

        it('should break all nested tests on ERROR', function() {
            hermione.emit(hermione.events.ERROR, new Error('err'), beforeHook);
            commonCaseVerification();
            assert.equal(suites[0].testcases[0].status, 'broken', 'test should be broken');
        });

        it('should save correct structure on ERROR after execution', function() {
            topSuite.parent = rootSuite;
            hermione.emit(hermione.events.SUITE_BEGIN, topSuite);
            hermione.emit(hermione.events.TEST_BEGIN, mochaTest2);
            hermione.emit(hermione.events.TEST_PASS, mochaTest2);
            hermione.emit(hermione.events.SUITE_END, topSuite);
            hermione.emit(hermione.events.ERROR, new Error('err'), beforeHook);
            //console.log(suites);
            assert.lengthOf(suites, 2, 'both suites should be saved');
            assert.lengthOf(suites[0].testcases, 1, 'first test should be saved in first suite');
            assert.lengthOf(suites[1].testcases, 1, 'second test should be saved in second suite');
            assert.equal(suites[1].name, 'suite', 'top suite should have common name');
            assert.equal(suites[1].testcases[0].name, 'test', 'test should have detached name');
            assert.equal(suites[1].testcases[0].status, 'broken', 'test should be broken');
            assert.equal(suites[0].name, 'topSuite', 'top suite should have common name');
            assert.equal(suites[0].testcases[0].name, 'suite2 test2', 'test should have detached name');
            assert.equal(suites[0].testcases[0].status, 'passed', 'test should be passed');
        });

        it('should save correct structure on ERROR during execution', function() {
            topSuite.parent = rootSuite;
            hermione.emit(hermione.events.SUITE_BEGIN, topSuite);
            hermione.emit(hermione.events.ERROR, new Error('err'), beforeHook);
            hermione.emit(hermione.events.TEST_BEGIN, mochaTest2);
            hermione.emit(hermione.events.TEST_PASS, mochaTest2);
            hermione.emit(hermione.events.SUITE_END, topSuite);
            assert.lengthOf(suites, 2, 'both suites should be saved');
            assert.lengthOf(suites[0].testcases, 1, 'first test should be saved in first suite');
            assert.lengthOf(suites[1].testcases, 1, 'second test should be saved in second suite');
            assert.equal(suites[0].name, 'suite', 'top suite should have common name');
            assert.equal(suites[0].testcases[0].name, 'test', 'test should have detached name');
            assert.equal(suites[0].testcases[0].status, 'broken', 'test should be broken');
            assert.equal(suites[1].name, 'topSuite', 'top suite should have common name');
            assert.equal(suites[1].testcases[0].name, 'suite2 test2', 'test should have detached name');
            assert.equal(suites[1].testcases[0].status, 'passed', 'test should be passed');
        });
    });

    describe('test', function() {
        it('should be ignored when started without suite', function() {
            hermione.emit(hermione.events.TEST_BEGIN, mochaTest2);
            hermione.emit(hermione.events.TEST_PASS, mochaTest2);
            assert.lengthOf(suites, 0);
        });

        it('should not be attached to wrong suite', function() {
            hermione.emit(hermione.events.SUITE_BEGIN, mochaTestSuite);
            hermione.emit(hermione.events.TEST_BEGIN, mochaTest2);
            hermione.emit(hermione.events.TEST_PASS, mochaTest2);
            hermione.emit(hermione.events.SUITE_END, mochaTestSuite);
            assert.lengthOf(suites, 1, 'empty suite should be saved');
            assert.lengthOf(suites[0].testcases, 0, 'suite should not contain any test');
        });

        it('should be attached to finished suite', function() {
            hermione.emit(hermione.events.SUITE_BEGIN, mochaTestSuite);
            hermione.emit(hermione.events.TEST_BEGIN, mochaTest2);
            hermione.emit(hermione.events.SUITE_END, mochaTestSuite);
            hermione.emit(hermione.events.TEST_PASS, mochaTest2);
            assert.lengthOf(suites, 1, 'empty suite should be saved');
            assert.lengthOf(suites[0].testcases, 0, 'suite should not contain any test');
        });

        it('should not be duplicated on calling TEST_BEGIN twice with same data', function() {
            hermione.emit(hermione.events.SUITE_BEGIN, mochaTestSuite);
            hermione.emit(hermione.events.TEST_BEGIN, mochaTest);
            hermione.emit(hermione.events.TEST_BEGIN, mochaTest);
            hermione.emit(hermione.events.TEST_PASS, mochaTest);
            hermione.emit(hermione.events.SUITE_END, mochaTestSuite);
            commonCaseVerification();
        });

        it('should not be duplicated on calling TEST_PASS twice with same data', function() {
            hermione.emit(hermione.events.SUITE_BEGIN, mochaTestSuite);
            hermione.emit(hermione.events.TEST_BEGIN, mochaTest);
            hermione.emit(hermione.events.TEST_PASS, mochaTest);
            hermione.emit(hermione.events.TEST_PASS, mochaTest);
            hermione.emit(hermione.events.SUITE_END, mochaTestSuite);
            commonCaseVerification();
        });

        it('should save proper structure and have pending status on TEST_PENDING', function() {
            hermione.emit(hermione.events.SUITE_BEGIN, topSuite);
            hermione.emit(hermione.events.TEST_PENDING, mochaTest2);
            hermione.emit(hermione.events.SUITE_END, topSuite);
            assert.lengthOf(suites, 1, '1 suite should be saved');
            assert.lengthOf(suites[0].testcases, 1, '1 test should be saved');
            assert.equal(suites[0].name, 'topSuite', 'top suite should have common name');
            assert.equal(suites[0].testcases[0].name, 'suite2 test2', 'test and parent suite names should be unbent');
            assert.equal(suites[0].testcases[0].status, 'pending', 'test should be pending');
        });
    });

    it('should unbend mocha tree structure', function() {
        hermione.emit(hermione.events.SUITE_BEGIN, topSuite);
        hermione.emit(hermione.events.TEST_BEGIN, mochaTest2);
        hermione.emit(hermione.events.TEST_PASS, mochaTest2);
        hermione.emit(hermione.events.SUITE_END, topSuite);
        assert.lengthOf(suites, 1, '1 suite should be saved');
        assert.lengthOf(suites[0].testcases, 1, '1 test should be saved');
        assert.equal(suites[0].name, 'topSuite', 'top suite should have common name');
        assert.equal(suites[0].testcases[0].name, 'suite2 test2', 'test and parent suite names should be unbent');
    });

    function commonCaseVerification() {
        assert.lengthOf(suites, 1, '1 suite should be saved');
        assert.lengthOf(suites[0].testcases, 1, '1 test should be saved');
        assert.equal(suites[0].name, 'suite', 'top suite should have common name');
        assert.equal(suites[0].testcases[0].name, 'test', 'test should have detached name');
    }
});
