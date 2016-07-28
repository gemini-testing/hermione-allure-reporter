'use strict';

var _ = require('lodash');

module.exports = {
    isTopEntity: function(mochaEntity) {
        return mochaEntity.parent && !mochaEntity.parent.parent;
    },

    getTopSuite: function(mochaEntity) {
        return this.isTopEntity(mochaEntity) ? mochaEntity : this.getTopSuite(mochaEntity.parent);
    },

    getTopSuiteTitle: function(mochaEntity) {
        return this.getTopSuite(mochaEntity).title;
    },

    /**
     * Отрезает имя верхнего сьюта от полного имени теста
     * @param mochaTest
     */
    cutTopSuiteTitle: function(mochaTest) {
        return mochaTest.fullTitle().replace(new RegExp('^' + this.getTopSuiteTitle(mochaTest) + '\\s', 'g'), '');
    },

    getAllSuiteTests: function(mochaSuite) {
        return _(mochaSuite.suites)
            .map(this.getAllSuiteTests.bind(this))
            .flatten()
            .concat(mochaSuite.tests)
            .value();
    },

    getSkipReason: function(entity) {
        return entity.skipReason
            || entity.parent && this.getSkipReason(entity.parent)
            || 'Unknown reason';
    }
};
