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
