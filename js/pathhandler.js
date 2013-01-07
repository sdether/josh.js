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

var Josh = Josh || {};
(function(root, $, _) {
  Josh.PathHandler = function(shell, config) {
    var _console = config.console || (Josh.Debug && root.console ? root.console : {
      log: function() {
      }
    });
    var _shell = shell;
    var self = {
      handlers: {
        ls: {
          exec: ls,
          completion: pathCompletionHandler
        },
        exec: {
          exec: exec,
          completion: commandAndPathCompletionHandler
        },
        cd: {
          exec: cd,
          completion: pathCompletionHandler
        },
        pwd: {
          exec: pwd,
          completion: pathCompletionHandler
        }
      },
      pathCompletionHandler: pathCompletionHandler,
      templates: {
        not_found: _.template("<div><%=cmd%>: <%=path%>: No such file or directory</div>"),
        ls: _.template("<div><% _.each(nodes, function(node) { %><span><%=node.name%>&nbsp;</span><% }); %></div>"),
        pwd: _.template("<div><%=node.path %>&nbsp;</div>"),
        prompt: _.template("<%= node.path %> $")
      },
      getNode: function(path, callback) {
        callback();
      },
      getChildNodes: function(node, callback) {
        callback([]);
      },
      getPrompt: function() {
        return self.templates.prompt({node: self.current});
      },
      current: null
    };

    self.handlers._original_exec = _shell.getCommandHandler('_exec');
    _shell.setCommandHandler("ls", self.handlers.ls);
    _shell.setCommandHandler("pwd", self.handlers.pwd);
    _shell.setCommandHandler("cd", self.handlers.cd);
    _shell.setCommandHandler("_exec", self.handlers.exec);
    _shell.onNewPrompt(function(callback) {
      callback(self.getPrompt());
    });

    function commandAndPathCompletionHandler(cmd, arg, line, callback) {
      if(arg[0] == '.' || arg[0] == '/') {
        return pathCompletionHandler(cmd, arg, line, callback);
      }
      return self.handlers._original_exec.completion(cmd, arg, line, callback);
    }

    function pathCompletionHandler(cmd, arg, line, callback) {
      _console.log("completing '" + arg+ "'");
      var partial = "";
      self.getNode(arg, function(node) {
        if(!node) {
          _console.log("no node");
          var lastPathSeparator = arg.lastIndexOf("/");
          if(lastPathSeparator == arg.length - 1) {
            return callback();
          }
          var parent = arg.substr(0, lastPathSeparator + 1);
          _console.log("parent: " + parent);
          partial = arg.substr(lastPathSeparator + 1);
          return self.getNode(parent, function(node) {
            if(!node) {
              return callback();
            }
            return completeChildren(node, partial, callback);
          });
        }
        if(!arg || arg[arg.length - 1] == '/') {
          return completeChildren(node, partial, callback);
        }
        return callback({
          completion: '/',
          suggestions: []
        });
      });
    }

    function completeChildren(node, partial, callback) {
      self.getChildNodes(node, function(childNodes) {
        callback(_shell.bestMatch(partial, _.map(childNodes, function(x) {
          return x.name;
        })));
      });
    }

    function exec(cmd, args, callback) {
      callback();
    }

    function cd(cmd, args, callback) {
      self.getNode(args[0], function(node) {
        if(!node) {
          return callback(self.templates.not_found({cmd: 'cd', path: args[0]}));
        }
        self.current = node;
        return callback();
      });
    }

    function pwd(cmd, args, callback) {
      callback(self.templates.pwd({node: self.current}));
    }

    function ls(cmd, args, callback) {
      _console.log('ls');
      if(!args || !args[0]) {
        return render_ls(self.current, self.current.path, callback);
      }
      return self.getNode(args[0], function(node) {
        render_ls(node, args[0], callback);
      });
    }

    function render_ls(node, path, callback) {
      if(!node) {
        return callback(self.templates.not_found({cmd: 'ls', path: path}));
      }
      return self.getChildNodes(node, function(children) {
        _console.log("finish render: " + node.name);
        callback(self.templates.ls({nodes: children}));
      });
    }

    return self;
  };
})(this, $, _);