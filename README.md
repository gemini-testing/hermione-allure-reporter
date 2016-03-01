Hermione-allure-plugin
===========

Provides Allure Report for [Hermione Runner](https://github.com/gemini-testing/hermione)


##Usage

```
plugins: {
    'allure': {
        targetDir: 'allure-results'
    }
}
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
