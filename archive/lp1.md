#Literate Programming

The idea is to create a node.js program that will take a markdown document and extract the code embedded in it. 

This is the first version and will be written in a sequential fashion to be saved as a file that can then be used to create itself and lp2 once that is written. 

For the next iteration, we want to be able to put pieces together into a file. It will have a file name on the first line of the code block and a segment name.


## The Plan

Open the file to read andread it, extract the list of names, extract the code blocks, piece them together, save file. 

1. Load modules
1. Load file
1. Chunk headings
2. Get list
4. String blocks
5. Save file

OUT: js

## Chunk headings

Parse out the section headings. These constitute "#+" followed by a name. Grab what follows. Parse code blocks indicated by 4 spaces in. One block per section reported, but can be broken up. Stitched together in sequence. 

To do this programmatically, we will split the whole text by newlines. At each line, analyze whether there is a "#" starting it--if so, get text after for name of section. At each line, check if there are four spaces. If so, add the line of code to the block. 

Note that there is no pre-optimization going on here. 

    var lines, line, i, n, match, head, code, name,
        blocks = {}, fullblocks = {}, current = [], curfull = [];
    lines = md.split("\n");
    n = lines.length;
    head = /^\s*(\#+)\s*(.+)$/;
    code = /^ {4}(.+)$/;
    for (i = 0; i < n; i += 1) {
      line = lines[i];
      match = head.exec(line);
      if (match) {
        current = blocks[match[2]] = [];
        curfull = fullblocks[match[2]] = [];
      } else {
        curfull.push(line);
        match = code.exec(line);
        if (match) {
          current.push(match[1]);
        } 
      }
    }
    for (name in blocks) {
      blocks[name] = blocks[name].join("\n");
    }


## Get list

Load up The Plan section. 

Each name should correspond to a section. If not, error message. If so, throw into an array to be pieced together. 

    var plan, items = [],  listitem;  //i, n, match,
    plan = fullblocks["The Plan"];
    n = plan.length;
    listitem = /\s*\d+\.\s*(.*)$/;
    for (i = 0; i < n; i += 1) {
      match = listitem.exec(plan[i]);
      if (match) {
        if (blocks.hasOwnProperty(match[1]) ) {
          items.push([match[1], blocks[match[1]]]);
        } else {
          console.log("no section named", match[1]);
        }
      } 
    }


## String blocks

We have the items array with the code in them. We can just join them. Add a comment line with the name. 

    var item, out;
    n = items.length;
    for (i = 0; i < n; i += 1) {
      item = items[i];
      items[i] = "\n//" + item[0] + "\n" + item[1]; 
    }
    out = items.join("\n");

## Load file

Get the filename from the command line arguments. It should be third item in [proccess.argv](http://nodejs.org/api/process.html#process_process_argv).  

No need to worry about async here so we use the sync version of [readFile](http://nodejs.org/api/fs.html#fs_fs_readfilesync_filename_encoding).

    var filename, md;
    filename = process.argv[2];
    md = fs.readFileSync(filename, 'utf8');

And now we want to strip the filename of its extension to use it for saving.

    filename  = filename.substring(0, filename.lastIndexOf('.'));

## Save file
    
Take the out items and save it to the filename.OUT where OUT is in the plan section

First let's get OUT.

    var ext = '', outexp;
    plan = fullblocks["The Plan"];
    n = plan.length;
    outexp = /\s*OUT\:\s*(\w+)/;
    for (i = 0; i < n; i += 1) {
      match = outexp.exec(plan[i]);
      if (match) {
        ext = "." + match[1];
      } 
    }    

Now let's save.

    filename = filename+ext;
    fs.writeFileSync(filename, out, 'utf8');


Done.


## Load modules

We need the filesystem module that is default installed.

    /*global require, process, console*/
    var fs = require('fs');

## References

I always have to look up the RegEx stuff. Here I created regexs and used their [exec](https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/RegExp/exec) method to get the chunks of interest. 

[MDN RegExp page](https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/RegExp)