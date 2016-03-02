# hermione-allure-reporter

Provides Allure Report for [Hermione Runner](https://github.com/gemini-testing/hermione).

## Install

```bash
$ npm install hermione-allure-reporter
```

## Usage

Add `allure-reporter` to the `plugins` property in your `Hermione` configuration:

```js
module.exports = {
    // ...

    plugins: {
        'allure-reporter': {
            targetDir: 'allure-results'
        }
    },

    // ...
};
```

If you've got test file without suites(`it`-only), like

```
// no describe block

it('test1', functuion() {
    // ...
});

it('test2', functuion() {
    // ...
});

//the end

```

This test results will look not so pretty like well-formed.
