'use strict';

module.exports = {

    isBeforeHook: function(mochaEntity) {
        return mochaEntity.type === 'hook' && /^.?before/.test(mochaEntity.title);
    },

    isTopSuite: function(mochaEntity) {
        return mochaEntity.parent && !mochaEntity.parent.parent;
    },

    getTopSuite: function(mochaEntity) {
        return this.isTopSuite(mochaEntity) ? mochaEntity : this.getTopSuite(mochaEntity.parent);
    },

    /**
     * Отрезает имя верхнего сьюта от полного имени теста
     * @param mochaTest
     * @returns {XML|string|void|*}
     */
    cutTopSuiteTitle: function(mochaTest) {
        return mochaTest.fullTitle().replace(new RegExp('^' + this.getTopSuite(mochaTest).title + '\\s', 'g'), '');
    },

    getAllSuiteTests: function(mochaSuite) {
        var tests = [];
        this.retrieveTests(mochaSuite, tests);
        return tests;
    },

    retrieveTests: function(mochaSuite, testsSet) {
        if (mochaSuite.suites && mochaSuite.suites.length) {
            mochaSuite.suites.forEach(function(suite) {
                this.retrieveTests(suite, testsSet);
            }.bind(this));
        } else {
            mochaSuite.tests.forEach(function(test) {
                testsSet.push(test);
            });
        }
    }
};
