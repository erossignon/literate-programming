#!/usr/bin/env node

/*global process, require, console*/
/*jslint evil:true*/
var program = require('commander');
var fs = require('fs');
var Doc = require('../lib/literate-programming').Doc;
var path = require('path');

program
    .version('0.8.1')
    .usage('[options] <file> <outdir> <arg1> ...')
    .option('-o --output <root>', 'Root directory for output')
    .option('-i --input <root>',  'Root directory for input')
    .option('-r --root <root>', 'Change root directory for both input and output')
    .option('-p --preview',  'Do not save the changes. Output first line of each file')
    .option('-f --free', 'Do not use the default standard library of plugins') 
    .option('-d --diff', 'Compare diffs of old file and new file')
    .option('-e --extension <ext>', 'requires a ext as extension for the file')
    .option('--verbose', 'Full warnings turned on')
;

program.parse(process.argv);

if ((! program.args[0]) ) {
    console.log("Need a file");
    process.exit();
}

var dir = program.dir || program.root || program.args[1] || process.cwd(); 
var indir = program.change || program.root || process.cwd();
var originalroot = process.cwd();
if (indir) {
    process.chdir(indir);
}

var verbose = program.verbose || 0;

if (program.extension) {
    if (program.args[0].substr(-program.extension.length) !== program.extension) {
        console.log("Requires extension: " + program.extension);
        process.exit();
    }
}

var md;
try {
    md = fs.readFileSync(program.args[0], 'utf8');
} catch (e) {
    console.log("Not readable file " + program.args[0]);
    md = ""; 
}

var inputs =  program.args.slice(2);

var postCompile; 

postCompile = function (text) {
    var passin = this;
    var doc = this.doc;
    var steps = doc.postCompile.steps;
    var i = 0; 
    var next = function(text) {
            if (i  < steps.length) {
                var step = steps[i];
                i+= 1;
                step[0].call(passin, text, next, step[1]);
            } else {
                // done
            }
        
        };
    next(text); 
};

postCompile.push = function (arr) {
        this.steps.push(arr);
    };

postCompile.steps = [];

if (program.preview) {
    postCompile.push([function (text, next) {
            var passin = this;
            var doc = passin.doc;
            if (passin.action && passin.action.filename) {
                var fname = passin.action.filename;
                doc.log(fname + ": " + text.length  + "\n"+text.match(/^([^\n]*)(?:\n|$)/)[1]);
            }
            next(text);
        }, {}]);
} else if (program.diff) {
    postCompile.push([function (text, next, obj) {        
            var passin = this;
            var doc = passin.doc;
            var fname = passin.action.filename;
        
            process.chdir(originalroot);
            if (obj.dir) {
                process.chdir(dir);
            }
        
            doc.log(fname + " diff not activated yet ");
            next(text);
        }, {dir:dir}]);
} else {
    postCompile.push([function (text, next, obj) {
            var passin = this;
            var doc = passin.doc;
            if (passin.action && passin.action.filename) {
                var fname = passin.action.filename;
        
                process.chdir(originalroot);
                if (obj.dir) {
                    process.chdir(dir);
                }            
                var cb = function (err) {
                        if (err) {
                            doc.log("Error in saving file " + fname + ": " + err.message);
                        } else {
                            doc.log("File "+ fname + " saved");
                        }
                        next(text);
                    };
        
                fs.writeFile(fname, text, 'utf8', cb);
            } else {
                next(text);
            }
        }, {dir: dir}]);
}

var standardPlugins, plugins; 

if (!program.free) {
    standardPlugins = require('literate-programming-standard');
    var original = process.cwd();
    var files;
    
    var matchf = function (el) {return el.match("lprc.js");};
    
    var current;
    plugins = {};
    var bits = original.split(path.sep);
    var lead = ( original[0] === path.sep) ? path.sep : "";
    do {
        current = lead + path.join.apply(path, bits);
        files = fs.readdirSync(current);
        files = files.filter(matchf);
        if (files.length === 1 ) {
            plugins = require(current+path.sep+files[0]);
            break;
        } else {
            bits.pop();
        }
    } while (bits.length > 0);
} else {
    standardPlugins = {};
}

if (!program.quiet) {
    postCompile.push([function (text, next) {
            var doc = this.doc;
            var logitem;
            var i, n = doc.logarr.length;
            for (i = 0; i < n; i += 1) {
                logitem = doc.logarr.shift();
                if ( (logitem[1] || 0) <= doc.verbose) {
                    console.log(logitem[0] );
                } 
            }
            next(text);
        }, {}]);
}

postCompile.push([function (text, next) {
        var doc = this.doc;
        try {
            delete doc.actions[this.action.msg];
        } catch (e) {
        }
        next(text);
    }, {}]);

var doc = new Doc(md, {
    standardPlugins : standardPlugins,
    plugins : plugins,
    postCompile : postCompile, 
    parents : null,
    fromFile : null,
    inputs : inputs,
    program : program,
    verbose : verbose
});

process.on('exit', function () {
    if (Object.keys(doc.waiting).length > 0 ) {
        console.log("The following blocks failed to compile: \n",  Object.keys(doc.waiting).join("\n "));
    } 
    if (Object.keys(doc.actions).length > 0 ) {
        console.log("The following actions failed to execute: \n",  Object.keys(doc.actions).join("\n "));
    } 

    var fdoc, fdocname;
    for (fdocname in doc.repo.litpro) {
        fdoc = doc.repo.litpro[fdocname]; 
        if (Object.keys(fdoc.waiting).length > 0 ) {
            console.log("The following blocks in "+fdocname+" failed to compile: \n",  Object.keys(fdoc.waiting).join("\n "));
        } 
        if (Object.keys(fdoc.actions).length > 0 ) {
            console.log("The following actions in "+fdocname+" failed to execute: \n",  Object.keys(fdoc.actions).join("\n "));
        }
    } 
});