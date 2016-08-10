josh.js 0.2
===========

http://sdether.github.io/josh.js/

***Javascript Online SHell*** provides a toolkit for building bash-like command line consoles for web pages. JOSH enables the visitor who prefers the bash-like command to maneuver through web content using a console rather than clicking with a mouse. This toolkit is most useful for people who like to use command line because it is faster and more effective than using a mouse. It is easier and convienent to access hierarchical information using JOSH command history, change or display current directory.  It consists of the following components:

* `readline.js` - full readline support for ctrl sequences, tab, history, etc.
* `shell.js` - visual presentation of the shell and command handling
* `pathhandler.js` - provide cd, ls, pwd and path completion toolikit
* `history.js` - localStorage backed command history
* `killring.js` - killring for kill & yank handling in readline

## What to use Josh for and when to use it

Josh allows developers to build their own command line interface to any sites. It supports full CLI Readline in the browser like TAB completion, emacs-style line editing, killring and history with reverse search. When you are tired of clicking your way through a hierachy tree, Josh will come in handy. It will helps you browse or navigate text files quickly and minimal the using of mouse click.

## Tutorials
* <a href="http://sdether.github.io/josh.js/helloworld.html">Hello world</a> - put a console on a web page and add a new custom command with completion
* <a href="http://sdether.github.io/josh.js/quakeconsole.html">Quake Console</a> - Create a <em>quake</em>-style console with <code>ls</code>,
    <code>cd</code>, <code>pwd</code> and bash filename tab-completion
* <a href="http://sdether.github.io/josh.js/githubconsole.html">GitHub Console</a> - Extend the Quake Console to talk to GitHub's REST API to navigate repositories, their branches and file system

## Articles
* <a href="http://www.claassen.net/geek/blog/2013/03/cli-all-the-things-introducing-josh-js.html">CLI all the things: Introducing Josh.js</a> Article about the origins of Josh.js with an example console for wordpress sites.

## License
josh.js is licensed under the Apache 2.0 License

## Status

* code is ready for experimental use
  * Tested under Chrome, Firefox, Safari and IE9
  * API may not yet be stable
* needs minified versions of complete toolkit and just readline.js
* needs code documentation and documentation site
* would like to add AMD support
* base shell UI should get some basic behaviors
  * `more`-like handling for output that exceeds the shell viewport size
  * resizing and close chrome
* Readline has not been tested with non-ascii.

## Usage

Until documentation is written, refer to `index.html` and `example.js` ([Annotated Source](http://sdether.github.com/josh.js/docs/example.html)) for a sample implementation of a shell with path completion.

## Components
***josh*** is built from 5 components and can be used in part or in full.

### readline.js

`readline.js` has no dependencies on any outside libraries, although it requires either `history.js` and `killring.js` or objects implementing the same calls.

It implements key trapping to bring [GNU Readline](http://cnswww.cns.cwru.edu/php/chet/readline/readline.html) like line editing to the browser. It can be used by itself to bring readline support to custom data entry fields or in conjunction with `shell.js` to create a full console.

#### Line Editing
In the below `C-x` refers to the `Ctrl-x` keystroke, while `M-x` refers to the `Meta-x` keystroke which is mapped to `Alt`, `⌘` and `Left Windows`.

<dl>
<dt><em>Movement</em></dt>
<dt><code>C-b</code> or <code>Left Arrow</code></dt>
<dd>Move back one character</dd>
<dt><code>M-b</code> or <code>Right Arrow</code></dt>
<dd>Move back one word</dd>
<dt><code>C-f</code></dt>
<dd>Move forward one character</dd>
<dt><code>M-f</code></dt>
<dd>Move forward one word</dd>
<dt><code>C-a</code> or <code>Home</code></dt>
<dd>Move to the beginning of the line</dd>
<dt><code>C-e</code> or <code>End</code></dt>
<dd>Move to the end of the line</dd>

<br/>
<dt><em>Edit/Kill</em></dt>
<dt><code>Backspace</code></dt>
<dd>Delete one character back</dd>
<dt><code>C-d</code> or <code>Delete</code></dt>
<dd>Delete character under cursor</dd>
<dt><code>C-k</code></dt>
<dd><em>Kill</em> (i.e. put in kill ring) text to the end of the line</dd>
<dt><code>M-Backspace</code></dt>
<dd><em>Kill</em> one word back</dd>
<dt><code>M-d</code></dt>
<dd><em>Kill</em> word under cursor</dd>
<dt><code>C-y</code></dt>
<dd><em>Yank</em> (i.e. pull from kill ring) the most recently <em>killed</em> text</dd>
<dt><code>M-y</code></dt>
<dd>Rotate to the next item in killring and yank it. Must be preceded by <em>yank</em></dd>

<br/>
<dt><em>History</em></dt>
<dt><code>C-r</code></dt>
<dd>Reverse search through history</dd>
<dt><code>C-p</code> or <code>Up Arrow</code></dt>
<dd>Previous entry in history</dd>
<dt><code>C-n</code> or <code>Down Arrow</code></dt>
<dd>Next entry in history</dd>
<dt><code>Page Up</code></dt>
<dd>Top of history</dd>
<dt><code>Page Down</code></dt>
<dd>Bottom of history</dd>

<br/>
<dt><em>Misc</em></dt>
<dt><code>C-l</code></dt>
<dd>refresh line (clear screen in shell)</dd>
<dt><code>Tab</code></dt>
<dd>Invoke completion handler for text under cursor</dd>
<dt><code>Esc</code> in reverse search</dt>
<dd>Cancel search</dd>
<dt><code>C-c</code></dt>
<dd>call <code>onCancel</code> handler</dd>
<dt><code>C-d</code> on empty line</dt>
<dd>call <code>onCancel</code> handler</dd>
</dl>
  
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

### killring.js
`killring.js` implements the kill and yank behavior as well as state tracking, i.e. multiple consecutive kills are combined as a single kill and killring rotation tracks the previous yank, so that the `readline.js` can remove the previous yank and replace it with the rotated text.

## Changelog

**0.2.10** -- 2014/04/03
* Added bower support (pr#19 - @bricef)
* Code clean-up for closure compiler issues (pr#20 - @aaronmars)

**0.2.9** -- 2013/08/31
* Added ability to bind ReadLine/Shell to an element.
* Added ability to bind/unbind keys (could be used to replace emacs bindings of readline, but primarily added to unbind some keys for using readline on input elements.
* Created input.js for easy binding of readline to either an input element or a span behaving like an input.

**0.2.8** -- 2013/03/13
* Added handling of . and .. in Josh.PathHandler.pathcompletionhandler, so that a trailing .. completes to ../ and . to ./
* Removed the hardcoded **strong** in the input template, making it a span instead so it can be styled via css instead.
* The prompt value itself is now assumed to be html instead of plain text, allowing for richer formatting without changing the input template.

**0.2.7** -- 2013/02/13
* Removed all html used for Shell UI generation from config to `Shell.templates`, so that they can easily be customized (see: [Issue 11](https://github.com/sdether/josh.js/issues/11))
* Removed `PathHandler.templates`. PathHandler now attches its templates to `Shell.templates` as well

**0.2.6** -- 2013/01/21
* Removed Activation/Deactivation keybindings from Readline, making it an outside concern (see: [Issue 2](https://github.com/sdether/josh.js/issues/2))
* Fixed Backspace regression introduced by 0.2.5
* Fixed `M-d` not deleting last character of line
* Example shell can now be resized (via jquery-ui.resizable)

**0.2.5** -- 2013/01/14
* Implemented missing Readline behavior (see: [Issue 1](https://github.com/sdether/josh.js/issues/1))
* Added scrollbar to sample implemenation (also adds scrollwheel support)

**0.2.4** -- 2013/01/14
* fixed path completion handling for scenarios of two possible completions where one is the root of the other
* noted that spaces in paths are completely unsupported right now.. they will complete, but the exec handler will see the space as a separator between arguments

**0.2.3** -- 2013/01/13
* changed internal handling of the default command handler (i.e. when no named command is defined).
* removed the pathhandler commandhandlers from the public object, since they should be accessed via shell.getCommandHandler if required
* some readline.js property naming cleanup to make closure compiler happy

**0.2.2** -- 2013/01/09
* changed rendering of completion to be more bash-like, i.e. now renders completion and then re-renders prompt with completed text, rather than as a pop-under that disappears.

**0.2.1** -- 2013/01/08
* fixed activation/deactivation propagation through the shell, which caused issues with first time activation via activation key instead of method call to fail.

**0.2** -- 2013/01/07
* console wrapper to allow debug logging to be turned on and off
* refactored how pathhandler attaches to shell because it needs to keep a reference to the shell
* refactored how prompts are set. now uses dedicated callback rather than returning the prompt in the `onEnter` callback
* tested and made fixes to ensure compatibility with major modern browsers

**0.1** -- 2013/01/04
* Initial code-complete release
