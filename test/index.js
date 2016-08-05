'use strict';

var allureReporter = require('../index'),
    EventEmitter = require('events').EventEmitter,
    writer = require('allure-js-commons/writer'),
    Tree = require('./suite-tree');

describe('Allure reporter', function() {
    var sandbox = sinon.sandbox.create(),
        hermione,
        suites;

    function initHermione_() {
        hermione = new EventEmitter();
        hermione.events = require('hermione/lib/constants/runner-events');
        hermione.config = {};

        allureReporter(hermione, {targetDir: 'allure-results'});
    }

    beforeEach(function() {
        initHermione_();

        suites = [];
        sandbox.stub(writer, 'writeSuite', function(dir, suite) {
            suites.push(suite);
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

        describe('`before all` hook fail', function() {
            var fullTitle = sinon.stub().returns('');

            it('should be supposed as one test fail', function() {
                var tree = new Tree().suite('suite').end();

                hermione.emit(hermione.events.SUITE_FAIL, {fullTitle: fullTitle, parent: tree.suite});

                assert.lengthOf(suites, 1);
                assert.lengthOf(suites[0].testcases, 1);
            });

            it('should be handled as one test fail', function() {
                var tree = new Tree().suite('awesomeSuite').end();

                hermione.emit(hermione.events.SUITE_FAIL, {
                    fullTitle: fullTitle.returns('"before all" hook failed'),
                    parent: tree.awesomeSuite,
                    err: new Error('awesome-error')
                });

                assert.equal(suites[0].name, 'awesomeSuite');
                assert.equal(suites[0].testcases[0].name, '"before all" hook failed');
                assert.equal(suites[0].testcases[0].status, 'failed');
                assert.equal(suites[0].testcases[0].failure.message, 'awesome-error');
            });
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

        describe('pending', function() {
            var tree;

            beforeEach(function() {
                tree = new Tree()
                    .suite('topSuite')
                        .suite('middleSuite')
                            .test('someTest')
                            .end()
                        .end();
            });

            function emitPending_() {
                hermione.emit(hermione.events.SUITE_BEGIN, tree.topSuite);
                hermione.emit(hermione.events.TEST_PENDING, tree.someTest);
                hermione.emit(hermione.events.SUITE_END, tree.topSuite);
            }

            it('should save whole tree', function() {
                emitPending_();

                assert.lengthOf(suites, 1);
                assert.lengthOf(suites[0].testcases, 1);
                assert.equal(suites[0].name, 'topSuite');
                assert.equal(suites[0].testcases[0].name, 'middleSuite someTest');
                assert.equal(suites[0].testcases[0].status, 'pending');
            });

            it('should show skip reason', function() {
                tree.someTest.skipReason = 'some-reason';

                emitPending_();

                assert.equal(
                    suites[0].testcases[0].failure.message,
                    'Test ignored: some-reason'
                );
            });

            it('should show skip reason if it is set for whole suite', function() {
                tree.topSuite.skipReason = 'some-reason';

                emitPending_();

                assert.equal(
                    suites[0].testcases[0].failure.message,
                    'Test ignored: some-reason'
                );
            });

            it('should show default skip reason if no reason set', function() {
                emitPending_();

                assert.equal(
                    suites[0].testcases[0].failure.message,
                    'Test ignored: Unknown reason'
                );
            });

            it('should attach issue label if there is a link in skip reason', function() {
                tree.someTest.skipReason = 'Will be fixed in https://som.tracker/TASK-100500 asap';

                emitPending_();

                assert.deepEqual(
                    suites[0].testcases[0].labels[0],
                    {name: 'issue', value: 'https://som.tracker/TASK-100500'}
                );
            });
        });

        it('should add screenshot attachment to failed test', function() {
            var tree = new Tree()
                    .suite('someSuite')
                        .test('someTest')
                        .end();

            tree.someTest.err = {screenshot: 'base64image='};
            sandbox.stub(writer, 'writeBuffer').returns('attachment.png');

            hermione.emit(hermione.events.SUITE_BEGIN, tree.someSuite);
            hermione.emit(hermione.events.TEST_BEGIN, tree.someTest);
            hermione.emit(hermione.events.TEST_FAIL, tree.someTest);
            hermione.emit(hermione.events.SUITE_END, tree.someSuite);

            var attachment = suites[0].testcases[0].attachments[0];

            assert.isOk(attachment);
            assert.equal(attachment.title, 'Screenshot');
            assert.equal(attachment.source, 'attachment.png');
            assert.equal(attachment.type, 'image/png');
        });

        it('should add meta info to failed test', function() {
            var tree = new Tree()
                    .suite('someSuite')
                        .test('someTest')
                        .end();

            tree.someTest.meta = {
                url: '/some/url',
                testId: 'some-id'
            };
            sandbox.stub(writer, 'writeBuffer').returns('attachment.png');

            hermione.emit(hermione.events.SUITE_BEGIN, tree.someSuite);
            hermione.emit(hermione.events.TEST_BEGIN, tree.someTest);
            hermione.emit(hermione.events.TEST_FAIL, tree.someTest);
            hermione.emit(hermione.events.SUITE_END, tree.someSuite);

            var params = suites[0].testcases[0].parameters;
            assert.includeDeepMembers(params, [
                {name: 'url', value: '/some/url', kind: 'environment-variable'},
                {name: 'testId', value: 'some-id', kind: 'environment-variable'}
            ]);
        });

        it('should add meta info to passed test', function() {
            var tree = new Tree()
                    .suite('someSuite')
                        .test('someTest')
                        .end();

            tree.someTest.meta = {
                url: '/some/url',
                testId: 'some-id'
            };
            sandbox.stub(writer, 'writeBuffer').returns('attachment.png');

            hermione.emit(hermione.events.SUITE_BEGIN, tree.someSuite);
            hermione.emit(hermione.events.TEST_BEGIN, tree.someTest);
            hermione.emit(hermione.events.TEST_PASS, tree.someTest);
            hermione.emit(hermione.events.SUITE_END, tree.someSuite);

            var params = suites[0].testcases[0].parameters;
            assert.includeDeepMembers(params, [
                {name: 'url', value: '/some/url', kind: 'environment-variable'},
                {name: 'testId', value: 'some-id', kind: 'environment-variable'}
            ]);
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
