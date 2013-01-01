var Josh = Josh || {};
(function(root, $) {
  Josh.PathHandler = function() {
    var self = {
      attach: function(shell) {
        shell.onCompletion(completionHandler);
        shell.setCommandHandler("ls", self.handlers.ls);
        shell.setCommandHandler("pwd", self.handlers.pwd);
        shell.setCommandHandler("cd", self.handlers.cd);
        shell.setCommandHandler("_default", self.handlers.exec);
        shell.setPrompt(self.getPrompt());
      },
      handlers: {
        ls: {
          exec: ls,
          completion: pathCompletionHandler
        },
        exec: {
          exec: exec,
          completion: pathCompletionHandler
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

    function pathCompletionHandler() {

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
        return render_ls(self.current, callback);
      }
      return self.getNode(args[0], function(node) {
        render_ls(node, callback);
      });
    }

    function render_ls(node, callback) {
      if(!node) {
        return callback(template.not_found({cmd: 'ls', path: node.path}));
      }
      return self.getChildNodes(node, function(children) {
        console.log("finish render: "+node.name);
        self.withPrompt(self.templates.ls({nodes: children}), callback);
      });
    }

    function completionHandler(line, callback) {
      var partial = line.text.substr(0, line.cursor);
      var parts = split(partial);
      console.log(parts);
      if(parts.length == 0) {
        return callback({suggestions: _commandList});
      }
      if(parts.length == 1) {
        var cmd = parts[0];
        if(startsWith(cmd, ".") || startsWith(cmd, "/")) {
          return completePath(cmd, callback);
        }
        return callback(bestMatch(cmd, _commandList));
      }
      return completePath(parts[1], callback);
    }

    function completePath(path, callback) {
      var uri = "/@api/deki/console/matches?path=" + encodeURIComponent(path);
      if(_current) {
        uri = uri + "&current=" + _current.Id;
      }
      $.getJSON(uri, function(data) {
        console.log(data);
        callback(bestMatch(path, data.Matches));
      });
    }

    function split(str) {
      var parts = str.split(/\s+/);
      if(parts.length > 0 && !parts[parts.length - 1]) {
        parts.pop();
      }
      return parts;
    }

    function startsWith(str1, str2) {
      return str1.slice(0, str2.length) == str2;
    }

    function bestMatch(partial, possible) {
      var completions = [];
      var common = '';
      for(var i = 0; i < possible.length; i++) {
        var option = possible[i];
        if(option.slice(0, partial.length) == partial) {
          completions.push(option);
          if(!common) {
            common = option;
            console.log("initial common:" + common);
          } else if(option.slice(0, common.length) != common) {
            console.log("find common stem for '" + common + "' and '" + option + "'");
            var j = partial.length;
            while(j < common.length && j < option.length) {
              if(common[j] != option[j]) {
                common = common.substr(0, j);
                break;
              }
              j++;
            }
          }
        }
      }
      if(completions.length == 0) {
        return;
      }
      if(completions.length == 1) {
        completions = null;
      }
      return {
        result: common.substr(partial.length),
        suggestions: completions
      };
    }

    return self;
  };
})(this, $, _);