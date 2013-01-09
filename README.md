josh.js 0.2
===========

http://sdether.github.com/josh.js/

***Javascript Online SHell*** provides a toolkit for building bash-like command line consoles for web pages. It consists of the following components:

* `readline.js` - full readline support for ctrl sequences, tab, history, etc.
* `shell.js` - visual presentation of the shell and command handling
* `pathhandler.js` - provide cd, ls, pwd and path completion toolikit
* `history.js` - localStorage backed command history

## License
josh.js is licensed under the Apache 2.0 License

## Status

* code is ready for experimental use
  * Tested under Chrome, Firefox, Safari and IE9
  * API may not yet be stable
* needs minified versions of complete toolkit and just readline.js
* needs code documentation and documenation site
* would like to add AMD support

## Usage

Until documentation is written, refer to `index.html` and `example.js` for a sample implementation of a shell with path completion.

## Components
***josh*** is built from 4 components and can be used in part or in full.

### readline.js

`readline.js` has no dependencies on any outside libraries, although it requires either `history.js` or an object implementing the same calls.

It implements key trapping to bring [GNU Readline](http://cnswww.cns.cwru.edu/php/chet/readline/readline.html) like line editing to the browser. It can be used by itself to bring readline support to custom data entry fields or in conjunction with `shell.js` to create a full console.

### shell.js
`shell.js` has external dependencies of [jQuery](http://jquery.com/), [Underscore](http://underscorejs.org/) and internal dependencies of `readline.js` and `history.js`.

It provides a simple console UI, using a *panel* for the console viewport and an auto-scrolling *view* inside the panel. It uses Underscore templates for generating the view html, although any template generator can be substituted as long as it can be expressed in the form of a function that takes a JSON object of arguments and returns an html string.

It also implements command handling so that new commands can be added by name with execution and completion handlers. Out of the box, `shell.js` provides the following commands:
* help - list all known commands (including user added)
* clear - clear the "screen" i.e. viewport
* history - show the command history captured by `readline.js` in `history.js`

### pathhandler.js
`pathhandler.js` is a mix in to easily add the `cd`, `ls` and `pwd` commands as well as path completion. It has the same external dependencies of [jQuery](http://jquery.com/), [Underscore](http://underscorejs.org/) as `shell.js` and also uses Underscore templating.

By implementing the functions `getNode` and `getChildNodes`, this library adds path traversal, discovery and completion just like a bash shell.

### history.js
`history.js` implements a localStorage back command history storage that persists over page changes and reloads. It is used by the `shell.js` history command to list all executed commands, and by `readline.js` for up/down arrow and reverse search capabilities.

## Changelog

**0.2.1** -- 2013/01/08
* fixed activation/deactivation propagation through the shell, which caused issues with first time activation via activation key instead of method call to fail.

**0.2** -- 2013/01/07
* console wrapper to allow debug logging to be turned on and off
* refactored how pathhandler attaches to shell because it needs to keep a reference to the shell
* refactored how prompts are set. now uses dedicated callback rather than returning the prompt in the `onEnter` callback
* tested and made fixes to ensure compatibility with major modern browsers

**0.1** -- 2013/01/04
* Initial code-complete release
