var Josh = Josh || {};
(function(root, $) {
  Josh.PathHandler = function() {
    var self = {
      attach: function(shell) {
        self.handlers._original_exec = shell.getCommandHandler('_exec');
        shell.setCommandHandler("ls", self.handlers.ls);
        shell.setCommandHandler("pwd", self.handlers.pwd);
        shell.setCommandHandler("cd", self.handlers.cd);
        shell.setCommandHandler("_exec", self.handlers.exec);
        shell.setPrompt(self.getPrompt());
      },
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
      withPrompt: function(output, prompt, cmdtext) {
        var callback = _.last(arguments);
        if(output == callback) {
          output = null;
        }
        if(prompt == callback) {
          prompt = null;
        }
        if(cmdtext == callback) {
          cmdtext = null;
        }
        if(!prompt) {
          prompt = self.getPrompt();
        }
        callback(output, prompt, cmdtext);
      },
      current: null
    };

    function commandAndPathCompletionHandler(cmd, arg, line, callback) {
      if(arg[0] == '.' || arg[0] == '/') {
        return pathCompletionHandler(cmd, arg, line, callback);
      }
      return self.handlers._original_exec.completion(cmd, arg, line, callback);
    }

    function pathCompletionHandler(cmd, arg, line, callback) {
      console.log("completing " + arg);
      var partial = "";
      self.getNode(arg, function(node) {
        if(!node) {
          console.log("no node");
          var lastPathSeparator = arg.lastIndexOf("/");
          if(lastPathSeparator == arg.length - 1) {
            return callback();
          }
          var parent = arg.substr(0, lastPathSeparator + 1);
          console.log("parent: " + parent);
          partial = arg.substr(lastPathSeparator + 1);
          return self.getNode(parent, function(node) {
            if(!node) {
              return callback();
            }
            return completeChildren(node, partial, callback);
          });
        }
        if(!arg || arg[arg.length-1] == '/') {
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
        callback(shell.bestMatch(partial, _.map(childNodes, function(x) {
          return x.name;
        })));
      });
    }

    function exec(cmd, args, callback) {
      self.withPrompt(callback);
    }

    function cd(cmd, args, callback) {
      self.getNode(args[0], function(node) {
        if(!node) {
          return callback(self.templates.not_found({cmd: 'cd', path: args[0]}));
        }
        self.current = node;
        return self.withPrompt(callback);
      });
    }

    function pwd(cmd, args, callback) {
      self.withPrompt(self.templates.pwd({node: self.current}), callback);
    }

    function ls(cmd, args, callback) {
      console.log('ls');
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
        console.log("finish render: " + node.name);
        self.withPrompt(self.templates.ls({nodes: children}), callback);
      });
    }

    return self;
  };
})(this, $, _);