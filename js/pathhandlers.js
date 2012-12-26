Josh.PathHandlers = function(shell, config) {
  shell.onCompletion(completionHandler);
  shell.setCommandHandler("ls", ls);
  shell.setCommandHandler("_default",exec);
  var self = {
    handlers: {
      ls: ls,
      exec: exec,
      cd: cd,
      pwd: pwd
    },
    pwd: {
      path: '/'
    }
  };

  function exec(cmd, args, callback) {
//    if(startsWith(cmd, ".") || startsWith(cmd, "/") || startsWith(cmd, "#")) {
//      path = cmd;
//      cmd = "show";
//    }
  }

  function cd(cmd, args, callback) {
  }

  function pwd(cmd, args, callback) {
    callback()
  }

  function ls(cmd, args, callback) {
    getPath(args[0], function() {
        var p = _.map(pages, function(page) {
          var lsInfo = { id: page.Id, segment: getSegment(page), name: page.DisplayName};
          lsInfo.name = lsInfo.name || lsInfo.segment;
          return lsInfo;
        });
        console.log(p);
        callback(_.template("<% _.each(p, function(page) { %><div>[<%=page.id%>]&nbsp;<%=page.segment%> (<%=page.name%>)</div> <% }); %>", {p: p}));
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

}