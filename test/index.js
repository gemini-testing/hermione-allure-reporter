'use strict';

var allureReporter = require('../index'),
    EventEmitter = require('events').EventEmitter,
    AllureSuite = require('allure-js-commons').Suite,
    Tree = require('./suite-tree');

describe('Allure reporter', function() {
    var sandbox = sinon.sandbox.create(),
        hermione,
        suites;

    function initHermione_() {
        hermione = new EventEmitter();
        hermione.events = require('hermione/lib/constants/runner-events');
        allureReporter(hermione, {targetDir: 'allure-results'});
    }

    beforeEach(function() {
        initHermione_();

        suites = [];
        sandbox.stub(AllureSuite.prototype, 'write', function() {
            suites.push(this);
        });
    });

    afterEach(function() {
        sandbox.restore();
    });

    describe('suite', function() {
        it('should be saved with one test with correct names', function() {
            var tree = new Tree()
                    .suite('topSuite')
                        .test('someTest')
                        .end();

            hermione.emit(hermione.events.SUITE_BEGIN, tree.topSuite);
            hermione.emit(hermione.events.TEST_BEGIN, tree.someTest);
            hermione.emit(hermione.events.TEST_PASS, tree.someTest);
            hermione.emit(hermione.events.SUITE_END, tree.topSuite);

            assert.lengthOf(suites, 1);
            assert.lengthOf(suites[0].testcases, 1);
            assert.equal(suites[0].name, 'topSuite');
            assert.equal(suites[0].testcases[0].name, 'someTest');
            assert.equal(suites[0].testcases[0].status, 'passed');
        });

        it('should be saved one test with correct names when it fails', function() {
            var tree = new Tree()
                    .suite('topSuite')
                        .test('someTest')
                        .end();

            hermione.emit(hermione.events.SUITE_BEGIN, tree.topSuite);
            hermione.emit(hermione.events.TEST_BEGIN, tree.someTest);
            hermione.emit(hermione.events.TEST_FAIL, tree.someTest);
            hermione.emit(hermione.events.SUITE_END, tree.topSuite);

            assert.lengthOf(suites, 1);
            assert.lengthOf(suites[0].testcases, 1);
            assert.equal(suites[0].name, 'topSuite');
            assert.equal(suites[0].testcases[0].name, 'someTest');
            assert.equal(suites[0].testcases[0].status, 'failed');
        });

        it('should not be duplicated on calling SUITE_BEGIN twice', function() {
            var tree = new Tree()
                    .suite('someSuite')
                    .end();

            hermione.emit(hermione.events.SUITE_BEGIN, tree.someSuite);
            hermione.emit(hermione.events.SUITE_BEGIN, tree.someSuite);
            hermione.emit(hermione.events.SUITE_END, tree.someSuite);

            assert.lengthOf(suites, 1);
        });

        it('should not be duplicated on calling SUITE_END twice', function() {
            var tree = new Tree()
                    .suite('someSuite')
                    .end();

            hermione.emit(hermione.events.SUITE_BEGIN, tree.someSuite);
            hermione.emit(hermione.events.SUITE_END, tree.someSuite);
            hermione.emit(hermione.events.SUITE_END, tree.someSuite);

            assert.lengthOf(suites, 1);
        });

        it('should be ignored if it is not top level suite', function() {
            var tree = new Tree()
                    .suite('topSuite')
                        .suite('middleSuite')
                        .end()
                    .end();

            hermione.emit(hermione.events.SUITE_BEGIN, tree.middleSuite);
            hermione.emit(hermione.events.SUITE_END, tree.middleSuite);

            assert.lengthOf(suites, 0);
        });

        it('should break all nested tests on ERROR', function() {
            var tree = new Tree()
                    .beforeHook('beforeHook')
                    .suite('topSuite')
                        .test('someTest')
                        .test('otherTest')
                        .end();

            hermione.emit(hermione.events.ERROR, new Error('err'), tree.beforeHook);

            assert.equal(suites[0].testcases[0].status, 'broken');
            assert.equal(suites[0].testcases[1].status, 'broken');
        });

        it('should not affect passed suite on ERROR after execution', function() {
            var tree = new Tree()
                    .suite('someSuite')
                        .beforeHook('beforeHook')
                        .test('someTest')
                        .end()
                    .suite('otherSuite')
                        .suite('middleSuite')
                            .test('otherTest')
                            .end()
                        .end();

            hermione.emit(hermione.events.SUITE_BEGIN, tree.otherSuite);
            hermione.emit(hermione.events.SUITE_BEGIN, tree.middleSuite);
            hermione.emit(hermione.events.TEST_BEGIN, tree.otherTest);
            hermione.emit(hermione.events.TEST_PASS, tree.otherTest);
            hermione.emit(hermione.events.SUITE_END, tree.middleSuite);
            hermione.emit(hermione.events.SUITE_END, tree.otherSuite);

            hermione.emit(hermione.events.ERROR, new Error('err'), tree.beforeHook);

            assert.lengthOf(suites, 2);

            assert.equal(suites[1].testcases[0].status, 'broken');

            assert.lengthOf(suites[0].testcases, 1);
            assert.equal(suites[0].name, 'otherSuite');
            assert.equal(suites[0].testcases[0].name, 'middleSuite otherTest');
            assert.equal(suites[0].testcases[0].status, 'passed');
        });

        it('should not affect passed suite on ERROR during execution', function() {
            var tree = new Tree()
                    .suite('someSuite')
                        .beforeHook('beforeHook')
                        .test('someTest')
                        .end()
                    .suite('otherSuite')
                        .suite('middleSuite')
                            .test('otherTest')
                            .end()
                        .end();

            hermione.emit(hermione.events.SUITE_BEGIN, tree.otherSuite);
            hermione.emit(hermione.events.ERROR, new Error('err'), tree.beforeHook);
            hermione.emit(hermione.events.SUITE_BEGIN, tree.middleSuite);
            hermione.emit(hermione.events.TEST_BEGIN, tree.otherTest);
            hermione.emit(hermione.events.TEST_PASS, tree.otherTest);
            hermione.emit(hermione.events.SUITE_END, tree.middleSuite);
            hermione.emit(hermione.events.SUITE_END, tree.otherSuite);

            assert.lengthOf(suites, 2);

            assert.equal(suites[0].testcases[0].status, 'broken');

            assert.lengthOf(suites[1].testcases, 1);
            assert.equal(suites[1].name, 'otherSuite');
            assert.equal(suites[1].testcases[0].name, 'middleSuite otherTest');
            assert.equal(suites[1].testcases[0].status, 'passed');
        });
    });

    describe('test', function() {
        it('should be ignored when started without suite', function() {
            var tree = new Tree()
                    .suite('someSuite')
                        .test('someTest')
                        .end();

            hermione.emit(hermione.events.TEST_BEGIN, tree.someTest);
            hermione.emit(hermione.events.TEST_PASS, tree.someTest);

            assert.lengthOf(suites, 0);
        });

        it('should not be attached to wrong suite', function() {
            var tree = new Tree()
                    .suite('someSuite')
                        .test('someTest')
                        .end()
                    .suite('otherSuite')
                    .end();

            hermione.emit(hermione.events.SUITE_BEGIN, tree.otherSuite);
            hermione.emit(hermione.events.TEST_BEGIN, tree.someTest);
            hermione.emit(hermione.events.TEST_PASS, tree.someTest);
            hermione.emit(hermione.events.SUITE_END, tree.otherSuite);

            assert.lengthOf(suites, 1);
            assert.lengthOf(suites[0].testcases, 0);
        });

        it('should not be attached to suite with another browser', function() {
            var firefoxTree = new Tree({browserId: 'firefox'})
                    .suite('firefox')
                .end(),
                chromeTree = new Tree({browserId: 'chrome'})
                .suite('firefox')
                    .test('someTest')
                .end();

            hermione.emit(hermione.events.SUITE_BEGIN, firefoxTree.firefox);
            hermione.emit(hermione.events.SUITE_BEGIN, chromeTree.firefox);
            hermione.emit(hermione.events.TEST_BEGIN, chromeTree.someTest);
            hermione.emit(hermione.events.TEST_PASS, chromeTree.someTest);
            hermione.emit(hermione.events.SUITE_END, firefoxTree.firefox);
            hermione.emit(hermione.events.SUITE_END, chromeTree.firefox);

            assert.lengthOf(suites, 2);
            assert.lengthOf(suites[0].testcases, 0);
            assert.lengthOf(suites[1].testcases, 1);
        });

        it('should be attached to suite with proper browser', function() {
            var firefoxTree = new Tree({browserId: 'firefox'})
                    .suite('suite')
                        .test('test')
                    .end(),
                chromeTree = new Tree({browserId: 'chrome'})
                    .suite('suite')
                        .test('test')
                    .end();

            hermione.emit(hermione.events.SUITE_BEGIN, firefoxTree.suite);
            hermione.emit(hermione.events.SUITE_BEGIN, chromeTree.suite);
            hermione.emit(hermione.events.TEST_BEGIN, chromeTree.test);
            hermione.emit(hermione.events.TEST_BEGIN, firefoxTree.test);
            hermione.emit(hermione.events.TEST_PASS, chromeTree.test);
            hermione.emit(hermione.events.TEST_PASS, firefoxTree.test);
            hermione.emit(hermione.events.SUITE_END, chromeTree.suite);
            hermione.emit(hermione.events.SUITE_END, firefoxTree.suite);

            assert.lengthOf(suites, 2);
            suites.forEach(function(suite) {
                assert.lengthOf(suite.testcases, 1);
            });
        });

        it('should be attached to suite with proper browser with different status', function() {
            var firefoxTree = new Tree({browserId: 'firefox'})
                    .suite('suite')
                    .test('test')
                    .end(),
                chromeTree = new Tree({browserId: 'chrome'})
                    .suite('suite')
                    .test('test')
                    .end();

            hermione.emit(hermione.events.SUITE_BEGIN, firefoxTree.suite);
            hermione.emit(hermione.events.SUITE_BEGIN, chromeTree.suite);
            hermione.emit(hermione.events.TEST_BEGIN, chromeTree.test);
            hermione.emit(hermione.events.TEST_BEGIN, firefoxTree.test);
            hermione.emit(hermione.events.TEST_PASS, chromeTree.test);
            hermione.emit(hermione.events.TEST_FAIL, firefoxTree.test);
            hermione.emit(hermione.events.SUITE_END, chromeTree.suite);
            hermione.emit(hermione.events.SUITE_END, firefoxTree.suite);

            assert.lengthOf(suites, 2);
            assert.equal(suites[0].testcases[0].status, 'passed');
            assert.equal(suites[1].testcases[0].status, 'failed');
        });

        it('should not be attached to finished suite', function() {
            var tree = new Tree()
                    .suite('someSuite')
                        .test('someTest')
                        .end()
                    .suite('otherSuite')
                    .end();

            hermione.emit(hermione.events.SUITE_BEGIN, tree.otherSuite);
            hermione.emit(hermione.events.TEST_BEGIN, tree.someTest);
            hermione.emit(hermione.events.SUITE_END, tree.otherSuite);
            hermione.emit(hermione.events.TEST_PASS, tree.someTest);

            assert.lengthOf(suites, 1);
            assert.lengthOf(suites[0].testcases, 0);
        });

        it('should not be duplicated on calling TEST_BEGIN twice for one test', function() {
            var tree = new Tree()
                    .suite('someSuite')
                        .test('someTest')
                        .end();

            hermione.emit(hermione.events.SUITE_BEGIN, tree.someSuite);
            hermione.emit(hermione.events.TEST_BEGIN, tree.someTest);
            hermione.emit(hermione.events.TEST_BEGIN, tree.someTest);
            hermione.emit(hermione.events.TEST_PASS, tree.someTest);
            hermione.emit(hermione.events.SUITE_END, tree.someSuite);

            assert.lengthOf(suites, 1);
            assert.lengthOf(suites[0].testcases, 1);
            assert.equal(suites[0].testcases[0].name, 'someTest');
        });

        it('should not be duplicated on calling TEST_PASS twice for one test', function() {
            var tree = new Tree()
                    .suite('someSuite')
                        .test('someTest')
                        .end();

            hermione.emit(hermione.events.SUITE_BEGIN, tree.someSuite);
            hermione.emit(hermione.events.TEST_BEGIN, tree.someTest);
            hermione.emit(hermione.events.TEST_PASS, tree.someTest);
            hermione.emit(hermione.events.TEST_PASS, tree.someTest);
            hermione.emit(hermione.events.SUITE_END, tree.someSuite);

            assert.lengthOf(suites, 1);
            assert.lengthOf(suites[0].testcases, 1);
            assert.equal(suites[0].testcases[0].name, 'someTest');
        });

        it('should save whole tree for pending test', function() {
            var tree = new Tree()
                    .suite('topSuite')
                        .suite('middleSuite')
                            .test('someTest')
                            .end()
                        .end();

            hermione.emit(hermione.events.SUITE_BEGIN, tree.topSuite);
            hermione.emit(hermione.events.TEST_PENDING, tree.someTest);
            hermione.emit(hermione.events.SUITE_END, tree.topSuite);

            assert.lengthOf(suites, 1);
            assert.lengthOf(suites[0].testcases, 1);
            assert.equal(suites[0].name, 'topSuite');
            assert.equal(suites[0].testcases[0].name, 'middleSuite someTest');
            assert.equal(suites[0].testcases[0].status, 'pending');
        });
    });

    it('should unbend mocha tree structure', function() {
        var tree = new Tree()
                .suite('topSuite')
                    .suite('middleSuite')
                        .test('someTest')
                        .end()
                    .end();

        hermione.emit(hermione.events.SUITE_BEGIN, tree.topSuite);
        hermione.emit(hermione.events.TEST_BEGIN, tree.someTest);
        hermione.emit(hermione.events.TEST_PASS, tree.someTest);
        hermione.emit(hermione.events.SUITE_END, tree.topSuite);

        assert.lengthOf(suites, 1);
        assert.lengthOf(suites[0].testcases, 1);
        assert.equal(suites[0].name, 'topSuite');
        assert.equal(suites[0].testcases[0].name, 'middleSuite someTest');
    });
});
