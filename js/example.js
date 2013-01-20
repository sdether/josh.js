/* ------------------------------------------------------------------------*
 * Copyright 2013 Arne F. Claassen
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
    var _console = (Josh.Debug && root.console) ? root.console : {
      log: function() {
      }
    };
    var fs = {
      bin: {},
      boot: {},
      dev: {},
      etc: {
        default: {},
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
      var: {
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

    function buildTree(parent, node) {
      parent.childnodes = _.map(_.pairs(node), function(pair) {
        var child = {
          name: pair[0],
          path: parent.path + "/" + pair[0],
          parent: parent
        };
        buildTree(child, pair[1]);
        return child;
      });
      parent.children = _.keys(node);
      return parent;
    }

    function findNode(current, parts, callback) {
      if(!parts || parts.length == 0) {
        return callback(current);
      }
      if(parts[0] == ".") {
        // carry on
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

    var root = buildTree({
        name: "",
        path: ""
      },
      fs
    );
    root.path = '/';
    var history = Josh.History();
    var killring = new Josh.KillRing();
    var readline = new Josh.ReadLine({history: history, killring: killring, console: _console });
    var shell = Josh.Shell({readline: readline, history: history, console: _console});
    var killringItemTemplate = _.template("<div><%- i %>&nbsp;<%- cmd %></div>");

    shell.setCommandHandler("killring", {
      exec: function(cmd, args, callback) {
        if(args[0] == "-c") {
          killring.clear();
          callback();
          return;
        }
        var content = $('<div></div>');
        _.each(killring.items(), function(cmd, i) {
          content.append(killringItemTemplate({cmd: cmd, i: i}));
        });
        callback(content);
      }
    });
    var pathhandler = Josh.PathHandler(shell, {console: _console});
    pathhandler.current = root;
    pathhandler.getNode = function(path, callback) {
      if(!path) {
        return callback(pathhandler.current);
      }
      var parts = _.filter(path.split('/'), function(x) {
        return x;
      });
      var start = ((path || '')[0] == '/') ? root : pathhandler.current;
      _console.log('start: ' + start.path + ', parts: ' + JSON.stringify(parts));
      return findNode(start, parts, callback);
    };
    pathhandler.getChildNodes = function(node, callback) {
      _console.log("children for " + node.name);
      callback(node.childnodes);
    };

    $(document).ready(function() {
      $(document).keypress(function(event) {
        if(shell.isActive()) {
          return;
        }
        _console.log("activating shell");
        if(event.keyCode == 126) {
          event.preventDefault();
          shell.activate();
          showConsole();
        }
      });
      var $consolePanel = $('#shell-panel');
      $consolePanel.resizable({ handles: "s"});
      function showConsole() {
        $consolePanel.slideDown();
        $consolePanel.focus();
      }

      function hideConsole() {
        $consolePanel.slideUp();
        $consolePanel.blur();
      }

      function hideAndDeactivate() {
        _console.log("deactivating shell")
        shell.deactivate();
        hideConsole();
      }

      shell.onEOT(hideAndDeactivate);
      shell.onCancel(hideAndDeactivate);
    });
    Josh.Instance = {
      Tree: root,
      Shell: shell,
      PathHandler: pathhandler,
      KillRing: killring
    };
  })(root, $, _);
})(this, $, _);
