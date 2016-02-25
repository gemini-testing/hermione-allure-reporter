'use strict';

var inherit = require('inherit'),
    _ = require('lodash'),
    MochaSuite = require('mocha/lib/suite'),
    MochaTest = require('mocha/lib/test'),
    MochaHook = require('mocha/lib/hook');

var Suite = inherit({
    __constructor: function(mochaSuite, parent) {
        this._parent = parent;
        this._suite = mochaSuite;
    },

    suite: function(title) {
        var suite = MochaSuite.create(this._suite, title);
        this._addChild(title, suite);
        return new Suite(suite, this);
    },

    test: function(title) {
        var test = new MochaTest(title, _.noop);
        this._suite.tests.push(test);
        return this._addChild(title, test);
    },

    beforeHook: function(title) {
        var hook = new MochaHook('before hook', _.noop);
        return this._addChild(title, hook);
    },

    _addChild: function(title, child) {
        child.parent = this._suite;
        this._push(title, child);
        return this;
    },

    end: function() {
        return this._parent;
    },

    _push: function(title, obj) {
        return this._parent._push(title, obj);
    }
});

module.exports = inherit(Suite, {
    __constructor: function() {
        this._suite = new MochaSuite('');
    },

    _push: function(title, obj) {
        this[title] = obj;
    },

    end: function() {
        return this;
    }
});
