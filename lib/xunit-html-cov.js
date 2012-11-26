
/**
 * Module dependencies.
 */

var mocha = require("mocha")
    , Base = mocha.reporters.Base
    , utils = mocha.utils
    , escape = utils.escape
    , config = require(process.env.XUNIT_HTML_COV_CONFIG ? process.env.XUNIT_HTML_COV_CONFIG : "../config.json")
    , JSONCov = mocha.reporters.JSONCov
    , fs = require("fs")
    , xmlPath = config.xml || process.cwd()
    , htmlPath = config.html || process.cwd()
    , fdxml = fs.openSync(xmlPath, 'w', 0755)
    , fdhtml = fs.openSync(htmlPath, 'w', 0755);
  
/**
 * Save timer references to avoid Sinon interfering (see GH-237).
 */

var Date = global.Date
    , setTimeout = global.setTimeout
    , setInterval = global.setInterval
    , clearTimeout = global.clearTimeout
    , clearInterval = global.clearInterval;

/**
 * Expose `XUnitHTMLCOV`.
 */

exports = module.exports = XUnitHTMLCOV;

/**
 * Initialize a new `XUnitHTMLCOV` reporter.
 *
 * @param {Runner} runner
 * @api public
 */

function XUnitHTMLCOV(runner) {
    Base.call(this, runner);

    var stats = this.stats
        , tests = []
        , jade = require('jade')
        , file = __dirname + '/templates/coverage.jade'
        , str = fs.readFileSync(file, 'utf8')
        , fn = jade.compile(str, { filename: file })
        , self = this;
    
    runner.on('pass', function(test){
        tests.push(test);
    });
  
    runner.on('fail', function(test){
        tests.push(test);
    });

    JSONCov.call(this, runner, false);

    runner.on('end', function(){
        var cov = global._$jscoverage || {};
        var result = self.cov = map(cov);
    
        appendhtmlLine(fn({
            cov: self.cov
            , coverageClass: coverageClass
        }));
        fs.closeSync(fdhtml);

    appendxmlLine(tag('testsuite', {
        name: 'Mocha Tests'
        , tests: stats.tests
        , coverage: result.coverage
        , hits: result.hits
        , misses: result.misses
        , sloc: result.sloc
        , failures: stats.failures
        , errors: stats.failures
        , skip: stats.tests - stats.failures - stats.passes
        , timestamp: (new Date).toUTCString()
        , time: stats.duration / 1000
        }, false));

        for (var filename in cov) {
            var data = coverage(filename, cov[filename]);

            appendxmlLine(tag('test', {
            filename: filename
            , coverage: data.coverage
            , hits: data.hits
            , misses: data.misses
            , sloc: data.sloc
            }, false));
        
            appendxmlLine('</test>');
        }

    tests.forEach(test);
    appendxmlLine('</testsuite>');
    fs.closeSync(fdxml);
    });
}

/**
 * Inherit from `Base.prototype`.
 */

XUnitHTMLCOV.prototype.__proto__ = Base.prototype;

/**
 * Map jscoverage data to a JSON structure
 * suitable for reporting.
 *
 * @param {Object} cov
 * @return {Object}
 * @api private
*/

function map(cov) {
    var ret = {
        instrumentation: 'node-jscoverage'
        , sloc: 0
        , hits: 0
        , misses: 0
        , coverage: 0
        , files: []
    };

    for (var filename in cov) {
        var data = coverage(filename, cov[filename]);

        ret.files.push(data);
        ret.hits += data.hits;
        ret.misses += data.misses;
        ret.sloc += data.sloc;
    }

    if (ret.sloc > 0) {
        ret.coverage = (ret.hits / ret.sloc) * 100;
    }

    return ret;
};

/**
 * Map jscoverage data for a single source file
 * to a JSON structure suitable for reporting.
 *
 * @param {String} filename name of the source file
 * @param {Object} data jscoverage coverage data
 * @return {Object}
 * @api private
*/

function coverage(filename, data) {
    var ret = {
        filename: filename,
        coverage: 0,
        hits: 0,
        misses: 0,
        sloc: 0,
        source: {}
    };

    data.source.forEach(function(line, num){
        num++;

        if (data[num] === 0) {
            ret.misses++;
            ret.sloc++;
        } else if (data[num] !== undefined) {
            ret.hits++;
            ret.sloc++;
        }

        ret.source[num] = {
            source: line
            , coverage: data[num] === undefined
            ? ''
            : data[num]
        };
    });

    ret.coverage = ret.hits / ret.sloc * 100;

    return ret;
}

/**
 * Return a plain-object representation of `test`
 * free of cyclic properties etc.
 *
 * @param {Object} test
 * @return {Object}
 * @api private
*/

function clean(test) {
    return {
        title: test.title
        , fullTitle: test.fullTitle()
        , duration: test.duration
    }
}

/**
 * Output tag for the given `test.`
 */

function test(test) {
    var attrs = {
        classname: test.parent.fullTitle()
        , name: test.title
        , time: test.duration / 1000
    };

    if ('failed' == test.state) {
        var err = test.err;
        attrs.message = escape(err.message);
        appendxmlLine(tag('testcase', attrs, false, tag('failure', attrs, false, cdata(err.stack))));
    } else if (test.pending) {
        appendxmlLine(tag('testcase', attrs, false, tag('skipped', {}, true)));
    } else {
        appendxmlLine(tag('testcase', attrs, true) );
    }
}

/**
 * HTML tag helper.
 */

function tag(name, attrs, close, content) {
    var end = close ? '/>' : '>'
        , pairs = []
        , tag;

    for (var key in attrs) {
        pairs.push(key + '="' + escape(attrs[key]) + '"');
    }

    tag = '<' + name + (pairs.length ? ' ' + pairs.join(' ') : '') + end;
    if (content) tag += content + '</' + name + end;
    return tag;
}

/**
 * Return cdata escaped CDATA `str`.
 */

function cdata(str) {
    return '<![CDATA[' + escape(str) + ']]>';
}

function appendxmlLine(line) {
    fs.writeSync(fdxml, line + "\n", null, 'utf8');
}

function appendhtmlLine(line) {
    fs.writeSync(fdhtml, line + "\n", null, 'utf8');
}

/**
 * Return coverage class for `n`.
 *
 * @return {String}
 * @api private
*/

function coverageClass(n) {
    if (n >= 75) return 'high';
    if (n >= 50) return 'medium';
    if (n >= 25) return 'low';
    return 'terrible';
}
