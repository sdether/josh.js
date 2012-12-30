(function($, _, document, window) {
  Shell = function(config) {
    config = config || {};

    // instance fields
    var _prompt = config.prompt || 'jsh$';
    var _shell_view_id = config.shell_view_id || '#shell-view';
    var _shell_panel_id = config.shell_panel_id || '#shell-panel';
    var _input_id = config.input_id || '#shell-cli';
    var _input_html = config.input_html || '<div id="shell-cli"><strong class="prompt"></strong>&nbsp;<span class="input"><span class="left"/><span class="cursor"/><span class="right"/></span></div>';
    var _search_html = config.search_html || '<div id="shell-cli">(reverse-i-search)`<span class="searchterm"></span>\':&nbsp;<span class="input"><span class="left"/><span class="cursor"/><span class="right"/></span></div>';
    var _suggest_html = config.suggest_html || '<div id="shell-suggest"></div>';
    var _suggest_id = config.suggest_id = "#shell-suggest";
    var _blinktime = config.blinktime || 500;
    var _history = config.history || new ReadLine.History();
    var _readline = config.readline || new ReadLine({history: _history});
    var _active = false;
    var _cursor_visible = false;
    var _suggestion;
    var _cmdHandlers = {
      clear: function(cmd, args, callback) {
        $(_input_id).parent().empty();
        callback();
      },
      help: function(cmd, args, callback) {
        var content = $('<div><div><strong>Commands:</strong></div></div>');
        var itemTemplate = _.template('<div>&nbsp;<%=command%></div>');
        _.each(commands(), function(command) {
          content.append(itemTemplate({command: command}))
        });
        callback(content);
      },
      history: function(cmd, args, callback) {
        if(args[0] == "-c") {
          _history.clear();
          callback();
          return;
        }
        var content = $('<div></div>');
        var itemTemplate = _.template("<div><%- i %>&nbsp;<%- cmd %></div>");
        _.each(_history.items(), function(cmd, i) {
          content.append(itemTemplate({cmd: cmd, i: i}));
        });
        callback(content);
      },
      _unknown: function(cmd, args, callback) {
        var content = _.template('<div><strong>Unrecognized command:&nbsp;</strong><%=cmd%></div>', {cmd: cmd});
        callback(content);
      }
    };
    var _line = {
      text: '',
      cursor: 0
    };
    var _searchMatch = '';
    var _view, _panel;

    // public methods
    var self = {
      commands: commands,
      activate: function() {
        if($(_shell_view_id).length == 0) {
          _active = false;
          return;
        }
        if($(_input_id).length == 0) {
          $(_shell_view_id).append(_input_html);
        }
        _view = $(_shell_view_id);
        _panel = $(_shell_panel_id);
        self.refresh();
        _active = true;
        _readline.activate();
        blinkCursor();
      },
      deactivate: function() {
        console.log("deactivating");
        _active = false;
        _readline.deactivate();
//        if(_onDeactivate) {
//          _onDeactivate();
//        }
      },
      setCommandHandler: function(cmd, cmdHandler) {
        _cmdHandlers[cmd] = cmdHandler;
      },
      setPrompt: function(prompt) {
        _prompt = prompt;
        if(!_active) {
          return;
        }
        self.refresh();
      },
      onActivate: function(completionHandler) {
        _readline.onActivate(completionHandler);
      },
      onDeactivate: function(completionHandler) {
        _readline.onDeactivate(completionHandler);
      },
      onCompletion: function(completionHandler) {
        _readline.onCompletion(function(line, callback) {
          if(_suggestion) {
            $(_suggest_id).remove();
            _suggestion = null;
          }
          if(!line) {
            return;
          }
          completionHandler(line, function(completion) {
            console.log("completion: " + completion)
            if(!completion) {
              callback();
              return;
            }
            if(completion.suggestions) {
              _suggestion = $(_suggest_html);
              for(var i = 0; i < completion.suggestions.length; i++) {
                console.log("suggestion: " + completion.suggestions[i]);
                _suggestion.append($("<div></div>").text(completion.suggestions[i]));
              }
              console.log(_suggestion);
              $(_input_id).after(_suggestion);
            }
            self.scrollToBottom();
            callback(completion.result);
          });
        });
      },
      render: function() {
        var text = _line.text || '';
        var cursorIdx = _line.cursor || 0;
        if(_searchMatch) {
          cursorIdx = _searchMatch.cursoridx || 0;
          text = _searchMatch.text || '';
          $(_input_id + ' .searchterm').text(_searchMatch.term);
        }
        var left = _.escape(text.substr(0, cursorIdx)).replace(/ /g, '&nbsp;');
        var cursor = text.substr(cursorIdx, 1);
        var right = _.escape(text.substr(cursorIdx + 1)).replace(/ /g, '&nbsp;');
        $(_input_id + ' .prompt').text(_prompt);
        $(_input_id + ' .input .left').html(left);
        if(!cursor) {
          $(_input_id + ' .input .cursor').html('&nbsp;').css('textDecoration', 'underline');
        } else {
          $(_input_id + ' .input .cursor').text(cursor).css('textDecoration', 'underline');
        }
        $(_input_id + ' .input .right').html(right);
        _cursor_visible = true;
        self.scrollToBottom();
        console.log('rendered "' + text + '" w/ cursor at ' + cursorIdx);
      },
      refresh: function() {
        $(_input_id).replaceWith(_input_html);
        self.render();
        console.log('refreshed ' + _input_id);

      },
      scrollToBottom: function() {
        //_panel.scrollTop(_shell.height());
        _panel.animate({scrollTop: _view.height()}, 0);
      }
    };

    function commands() {
      return _.chain(_cmdHandlers).keys().filter(function(x) {
        return x[0] != "_"
      }).value();
    }

    function blinkCursor() {
      if(!_active) {
        return;
      }
      window.setTimeout(function() {
        if(!_active) {
          return;
        }
        _cursor_visible = !_cursor_visible;
        if(_cursor_visible) {
          $(_input_id + ' .input .cursor').css('textDecoration', 'underline');
        } else {
          $(_input_id + ' .input .cursor').css('textDecoration', '');
        }
        blinkCursor();
      }, _blinktime);
    }

    function split(str) {
      var parts = str.split(/\s+/);
      if(parts.length > 0 && !parts[parts.length - 1]) {
        parts.pop();
      }
      return parts;
    }

    // init
    _readline.onChange(function(line) {
      _line = line;
      self.render();
    });
    _readline.onSearchStart(function() {
      $(_input_id).replaceWith(_search_html);
      console.log('started search');
    });
    _readline.onSearchEnd(function() {
      $(_input_id).replaceWith(_input_html);
      _searchMatch = null;
      self.render();
      console.log("ended search");
    });
    _readline.onSearchChange(function(match) {
      _searchMatch = match;
      self.render();
    });
    _readline.onEnter(function(cmdtext, callback) {
      console.log("got command: " + cmdtext);
      var parts = split(cmdtext);
      var cmd = parts[0];
      var args = parts.slice(1);
      var handler = _cmdHandlers[cmd];
      if(!handler) {
        handler = _cmdHandlers['_default'];
        if(!handler) {
          handler = _cmdHandlers['_unknown'];
        }
      }
      return handler(cmd, args, function(output, prompt, cmdtext) {
        console.log("finished command " + cmd);
        if(output) {
          $(_input_id).after(output);
        }
        $(_input_id + ' .input .cursor').css('textDecoration', '');
        $(_input_id).removeAttr('id');
        $(_shell_view_id).append(_input_html);
        if(prompt) {
          self.setPrompt(prompt);
        }
        callback(cmdtext);
      });
    });
    _readline.onEOT(self.deactivate);
    _readline.onCancel(self.deactivate);
    return self;
  }
  ;
})
  (jQuery, _, document, window);
