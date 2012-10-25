(function($, document, window) {
  MtShell = function(config) {
    var _shell = new Shell();
    var _commandList = ['go', 'ls', 'cd', 'show'];
    var _namespaces = {
      0: "",
      2: "User:",
      10: "Template:",
      101: "Special:"
    };
    var _home = null;
    var _current = null;

    // public methods
    var self = {
      activate: function() {
        if(!_home) {
          getPage("/", function(page) {
            _home = page;
            setCurrent(_home);
            _shell.activate();
          });
        }
      },
      deactivate: function() {
        _shell.deactivate();
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
      $.getJSON("http://ariel.mindtouch.com/@api/deki/console/matches?path=" + path, function(data) {
        console.log(data);
        callback(bestMatch(path, data.Matches));
      });
    }

    function getPage(path, callback) {
      if(_current && (!path || path == '.')) {
        return callback(_current);
      }
      if(_home && path == '/') {
        return callback(_home);
      }
      $.getJSON("http://ariel.mindtouch.com/@api/deki/console/node?path=" + path, function(data) {
        console.log("page:"+data);
        callback(data);
      });
    }

    function cmdHandler(cmdtext, input_id, callback) {
      var parts = split(cmdtext);
      var cmd = parts[0];
      var path = parts[1];
      if(startsWith(cmd, ".") || startsWith(cmd, "/")) {
        path = cmd;
        cmd = "show";
      }
      switch(cmd) {
        case "go":
          callback();
          return;
        case"ls":
          callback();
          return;
        case "cd":
          getPage(path, function(page) {
            setCurrent(page);
            callback();
          });
          return;
        case "show":
          getPage(path, function(page) {
            show(input_id, page, callback);
          });
          return;
        default:
          var content = $('<div><strong>Unrecognized command:&nbsp;</strong><span class="cmd"></span></div>');
          $(content).find('.cmd').text(cmd);
          $(input_id).after(content);
          callback();
          return;
      }
    }

    function setCurrent(page) {
      _current = page;
      setPrompt();
    }

    function setPrompt() {
      _shell.setPrompt(" /" + _namespaces[_current.Namespace] + _current.Path + " ["+_current.Id+ "] $ ");
    }

    function show(input_id, page, callback) {
      var content = $(
        '<div>'+
          '<div><strong>Id:&nbsp;</strong><span class="id"></span></div>'+
          '<div><strong>Path:&nbsp;</strong><span class="path"></span></div>'+
          '<div><strong>Displayname:&nbsp;</strong><span class="display"></span></div>'+
          '<div><strong>Parent Id:&nbsp;</strong><span class="parentid"></span></div>'+
          '<div><strong>Child Ids:&nbsp;</strong><span class="childids"></span></div>'+
        '</div>'
      );
      $(content).find('.id').text(page.Id);
      $(content).find('.path').text(" /" + _namespaces[page.Namespace] + page.Path);
      $(content).find('.display').text(page.DisplayName);
      $(content).find('.parentid').text(page.ParentId);
      $(content).find('.childids').text("["+page.ChildIds+"]");
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
})(jQuery, document, window);
