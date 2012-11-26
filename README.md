# Mocha Xunit-html-cov Reporter

## xunit-html-cov

The XunitHTMLCov reporter is similar to the xunit and html reporter, however when run against a library instrumented by node-jscoverage it will produce coverage output.

## How to use
* Add "xunit-html-cov" to your project's dev dependencies:


      {
          "name": "my-project",
          .
          .
          .
          "devDependencies": {
              .
              .
              "xunit-html-cov": "*"
          }
      }


* Run mocha with -R xunit-html-cov or --reporter xunit-html-cov
* The xunit-html-cov is stored in process.cwd() or a given path in the config.json



## Credits
This reporter is just the original [xunit reporter](https://github.com/visionmedia/mocha/blob/master/lib/reporters/xunit.js) and [html reporter](https://github.com/visionmedia/mocha/blob/master/lib/reporters/html.js) from mocha.
