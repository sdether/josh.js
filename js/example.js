/*------------------------------------------------------------------------*
 * Copyright 2013-2014 Arne F. Claassen
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *-------------------------------------------------------------------------*/
(function(root, $, _) {
  Josh.Example = (function(root, $, _) {

    // Enable console debugging, when Josh.Debug is set and there is a console object on the document root.
    var _console = (Josh.Debug && root.console) ? root.console : {
      log: function() {
      }
    };

    // Setup of Shell
    // --------------

    // build the *fake* directory structure used to illustrate path commands and completions.
    var treeroot = buildTree();

    // Create `History` and `KillRing` by hand since we will use the `KillRing` for an example command.
    var history = Josh.History();
    var killring = new Josh.KillRing();

    // Create the `ReadLine` instance by hand so that we can provide it our `KillRing`. Since the shell needs to share
    // the `History` object with `ReadLine` and `Shell` isn't getting to create `ReadLine` automatically as it usually does
    // we need to pass in `History` into `ReadLine` as well.
    var readline = new Josh.ReadLine({history: history, killring: killring, console: _console });

    // Finally, create the `Shell`.
    var shell = Josh.Shell({readline: readline, history: history, console: _console});


    // Create *killring* command
    // -------------------------

    // Setup the `Underscore` template for displaying items in the `KillRing`.
    var killringItemTemplate = _.template("<div><% _.each(items, function(item, i) { %><div><%- i %>&nbsp;<%- item %></div><% }); %></div>");

    // Create a the command `killring` which will display all text currently in the `KillRing`, by attaching
    // a handler to the `Shell`.
    shell.setCommandHandler("killring", {

      // We don't implement any completion for the `killring` command, so we only provide an `exec` handler, and no `completion` handler.
      exec: function(cmd, args, callback) {

        // `killring` takes one optional argument **-c** which clears the killring (just like **history -c**).
        if(args[0] == "-c") {
          killring.clear();

          // The callback of an `exec` handler expects the html to display as result of executing the command. Clearing the
          // killing has no output, so we just call the callback and exit the handler.
          callback();
          return;
        }

        // Return the output of feeding all items from the killring into our template.
        callback(killringItemTemplate({items: killring.items()}));
      }
    });

    // Setup PathHandler
    // -----------------

    // `PathHandler` is a mix-in for `Shell` to provide provide the standard unix `ls`, `pwd` and `cd` commands, as well
    // as standard *bash*-style path tab-completion. It expects a `Shell` instance as its first argument so that it can
    // attach its command handlers to the shell as well as overrride the default handler to support completion of path's
    // starting with `.` or `/` without a leading command.
    var pathhandler = new Josh.PathHandler(shell, {console: _console});

    // `PathHandler` operates on path nodes which are expected to be objects with the minimum structure of
    //
    //     {
    //       name: 'localname',
    //       path: '/full/path/to/localname'
    //     }
    //
    // where name is the `name` of the node and `path` is the absolute path to the node. PathHandler does not modify
    // these nodes, so any additional state your implementation requires can be attached to the nodes and be relied on
    // being part of the node when received by the handling methods you implement.
    //
    // The pathhandler expects to be initialized with the current *directory*, i.e. a path node.
    pathhandler.current = treeroot;

    // `PathHandler` requires two method, `getNode` and `getChildNodes`, to be provided in order to operate.
    //
    // `getNode` gets called with *path* string. This string is completely opaque to `PathHandler`, i.e. constructs such
    // as `.` and `..` are an implementation detail. `PathHandler` does assume that the path separator is `/`. `getNode`
    // is called anytime the pathhandler has a path and need to determine what if any node exists at that path which happens
    // during path completion as well as `cd` and `ls` execution.
    pathhandler.getNode = function(path, callback) {
      if(!path) {
        return callback(pathhandler.current);
      }
      var parts = _.filter(path.split('/'), function(x) {
        return x;
      });
      var start = ((path || '')[0] == '/') ? treeroot : pathhandler.current;
      _console.log('start: ' + start.path + ', parts: ' + JSON.stringify(parts));
      return findNode(start, parts, callback);
    };

    // `getChildNodes` is used by path completion to determine the possible completion candidates. Path completion first
    // determines the node for the given path, looking for the nearest `/` in case if the given path does not return a
    // node via `getNode`. For our example, we've attached the child node objects directly to the node object, so we
    // can simply return it. Usually this would be used to call the server with the provided node's path or id so that
    // the appropriate children can be found.
    pathhandler.getChildNodes = function(node, callback) {
      _console.log("children for " + node.name);
      callback(node.childnodes);
    };

    // `findNode` is called recursively from `getNode` with the current node and remaining path already split into
    // segments. It then simply resolves the node for the next segment in `parts` to a node, including relative
    // references like `.` and `..`. In implementations that let you explore an hierarchy on a server, this function
    // would live on the server side and be called remotely via `getNode`.
    function findNode(current, parts, callback) {
      if(!parts || parts.length === 0) {
        return callback(current);
      }
      if(parts[0] == ".") {

      } else if(parts[0] == "..") {
        current = current.parent;
      } else {
        current = _.first(_.filter(current.childnodes, function(node) {
          return node.name == parts[0];
        }));
      }
      if(!current) {
        return callback();
      }
      return findNode(current, _.rest(parts), callback);
    }

    // Setup Document Behavior
    // -----------------------

    // Activation and display behavior happens at document ready time.
    $(root).ready(function() {

      // The default name for the div the shell uses as its container is `shell-panel`, although that can be changed via
      // the shell config parameter `shell-panel-id`. The `Shell` display model relies on a 'panel' to contain a 'view'.
      // The 'panel' acts as the view-port, i.e. the visible portion of the shell content, while the 'view' is appended
      // to and scrolled up as new content is added.
      var $consolePanel = $('#shell-panel');

      // We use **jquery-ui**'s `resizable` to let us drag the bottom edge of the console up and down.
      $consolePanel.resizable({ handles: "s"});

      // Wire up a the keypress handler. This will be used only for shell activation.
      $(document).keypress(function(event) {

        // If the shell is already active drop out of the keyhandler, since all keyhandling happens in `Readline`.
        if(shell.isActive()) {
          return;
        }

        // Mimicking *Quake*-style dropdown consoles, we activate and show on `~`.
        if(event.keyCode == 126) {
          _console.log("activating shell");
          event.preventDefault();
          shell.activate();
          $consolePanel.slideDown();
          $consolePanel.focus();
        }
      });

      // Whenever we get either a `EOT` (`Ctrl-D` on empty line) or a `Cancel` (`Ctrl-C`) signal from the shell,
      // we deactivate the shell and hide the console.
      function hideAndDeactivate() {
        _console.log("deactivating shell");
        shell.deactivate();
        $consolePanel.slideUp();
        $consolePanel.blur();
      }

      // Attach our hide function to the EOT and Cancel events.
      shell.onEOT(hideAndDeactivate);
      shell.onCancel(hideAndDeactivate);
    });

    // We attach the various objects we've created here to `Josh.Instance` purely so they can be inspected via a
    // javascript console. This is not required for the functionality of the example.
    Josh.Instance = {
      Tree: treeroot,
      Shell: shell,
      PathHandler: pathhandler,
      KillRing: killring
    };

    // This code builds our *fake* directory structure. Since most real applications of `Josh` would not keep their
    // entire hierarchy in memory, but instead make callbacks to a server to find nodes and node children, the details
    // of this function are of little interest.
    function buildTree() {
      var fs = {
        bin: {},
        boot: {},
        dev: {},
        etc: {
          'default': {},
          'rc.d': {},
          sysconfig: {},
          x11: {}
        },
        home: {
          bob: {
            video: {
              'firefly.m4v': {}
            },
            videos: {
              'Arrested Development': {
                's1e1.m4v': {}
              },
              'Better Off Ted': {
                's1e1.m4v': {}
              }
            }
          },
          jane: {}
        },
        lib: {},
        'lost+found': {},
        misc: {},
        mnt: {
          cdrom: {},
          sysimage: {}
        },
        net: {},
        opt: {},
        proc: {},
        root: {},
        sbin: {},
        usr: {
          x11: {},
          bin: {},
          include: {},
          lib: {},
          local: {},
          man: {},
          sbin: {},
          share: {
            doc: {}
          },
          src: {}
        },
        'var': {
          lib: {},
          lock: {},
          run: {},
          log: {
            httpd: {
              access_log: {},
              error_log: {}
            },
            'boot.log': {},
            cron: {},
            messages: {}
          }
        }
      };

      function build(parent, node) {
        parent.childnodes = _.map(_.pairs(node), function(pair) {
          var child = {
            name: pair[0],
            path: parent.path + "/" + pair[0],
            parent: parent
          };
          build(child, pair[1]);
          return child;
        });
        parent.children = _.keys(node);
        return parent;
      }
      var tree = build({name: "", path: ""}, fs);
      tree.path = '/';
      return tree;
    }
  })(root, $, _);
})(this, $, _);
