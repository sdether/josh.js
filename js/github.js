(function($, _, document, window, localStorage) {
  GitHubShell = function(config) {
    config = config || {};
    var shellConfig = {};
    if(config.history) {
      shellConfig.history = config.history;
    }
    if(config.shell_view_id) {
      shellConfig.shell_view_id = config.shell_view_id;
    } else {
      config.shell_view_id
    }
    var _shell = new Shell(shellConfig);
    var _commandList = _.sortBy(['go', 'ls', 'cd', 'show', 'pwd', 'help','clear'], function(x) {
      return x;
    });
    var _namespaces = {
      0: "",
      2: "User:",
      10: "Template:",
      101: "Special:"
    };
    var _home = null;
    var _current = null;
    var _localState = {
      active: false
    };
    // public methods
    var self = {
      activate: function() {
        _shell.activate();
      },
      deactivate: function() {
        _shell.deactivate();
      },
      onDeactivate: function(completionHandler) {
        _shell.onDeactivate(completionHandler);
      }
    };

    // private methods
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

    function cmdHandler(cmdtext, input_id, callback) {
      var parts = split(cmdtext);
      var cmd = parts[0];
      var path = parts[1];
      if(startsWith(cmd, ".") || startsWith(cmd, "/") || startsWith(cmd, "#")) {
        path = cmd;
        cmd = "show";
      }
      switch(cmd) {
        case "clear":
          $(input_id).siblings().remove();
          callback();
          return;
        case "help":
          var content = $('<div><div><strong>Commands:</strong></div></div>');
          _.each(_commandList, function(command) {
            content.append(_.template('<div>&nbsp;<%=command%></div>', {command: command}))
          });
          $(input_id).after(content);
          callback();
          return;
        case "go":
          getPage(path, function(page) {
            var path = getPath(page);
            console.log("navigating to " + path);
            window.location = path;
          });
          return;
        case"ls":
          ls(input_id, path, callback);
          return;
        case"pwd":
          $(input_id).after(getPath(_current));
          callback();
          return;
        case "cd":
          getPage(path, function(page) {
            callback(setCurrent(page));
          });
          return;
        case "show":
          getPage(path, function(page) {
            show(input_id, page, callback);
          });
          return;
        default:
          var content = _.template('<div><strong>Unrecognized command:&nbsp;</strong><%=cmd%></div>', {cmd: cmd});
          $(input_id).after(content);
          callback();
          return;
      }
    }

    function setCurrent(page) {
      _current = page;
      return getPath(_current) + " $";
    }

    function getPath(page) {
      return " /" + _namespaces[page.Namespace] + page.Path;
    }

    function getSegment(page) {
      var segments = page.Path.split('/');
      return segments[segments.length - 1];
    }

    function ls(input_id, path, callback) {
      getPage(path, function(page) {
        getChildren(page, function(pages) {
          var p = _.map(pages, function(page) {
            var lsInfo = { id: page.Id, segment: getSegment(page), name: page.DisplayName};
            lsInfo.name = lsInfo.name || lsInfo.segment;
            return lsInfo;
          });
          console.log(p);
          $(input_id).after(_.template("<% _.each(p, function(page) { %><div>[<%=page.id%>]&nbsp;<%=page.segment%> (<%=page.name%>)</div> <% }); %>", {p: p}));
          callback();
        });
      });
    }

    function getChildren(page, callback) {
      $.getJSON("/@api/deki/console/node/" + page.Id + "/children", function(children) {
        callback(children);
      });
    }

    function show(input_id, page, callback) {
      var content = $(
        '<div>' +
          '<div><strong>Id:&nbsp;</strong><span class="id"></span></div>' +
          '<div><strong>Path:&nbsp;</strong><span class="path"></span></div>' +
          '<div><strong>Displayname:&nbsp;</strong><span class="display"></span></div>' +
          '<div><strong>Parent Id:&nbsp;</strong><span class="parentid"></span></div>' +
          '<div><strong>Child Ids:&nbsp;</strong><span class="childids"></span></div>' +
          '</div>'
      );
      $(content).find('.id').text(page.Id);
      $(content).find('.path').text(" /" + _namespaces[page.Namespace] + page.Path);
      $(content).find('.display').text(page.DisplayName);
      $(content).find('.parentid').text(page.ParentId);
      $(content).find('.childids').text("[" + page.ChildIds + "]");
      $(input_id).after(content);
      callback();
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


    _shell.onCompletion(completionHandler);
    _shell.onCmd(cmdHandler);

    return self;
  };

})
  (jQuery, _, document, window, localStorage);
