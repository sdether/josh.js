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
  Josh.Shell = function(config) {
    config = config || {};

    // instance fields
    var _console = config.console || (Josh.Debug && root.console ? root.console : {
      log: function() {
      }
    });
    var _prompt = config.prompt || 'jsh$';
    var _shell_view_id = config.shell_view_id || '#shell-view';
    var _shell_panel_id = config.shell_panel_id || '#shell-panel';
    var _input_id = config.input_id || '#shell-cli';
    var _input_html = config.input_html || '<div id="shell-cli"><strong class="prompt"></strong>&nbsp;<span class="input"><span class="left"/><span class="cursor"/><span class="right"/></span></div>';
    var _search_html = config.search_html || '<div id="shell-cli">(reverse-i-search)`<span class="searchterm"></span>\':&nbsp;<span class="input"><span class="left"/><span class="cursor"/><span class="right"/></span></div>';
    var _suggest_html = config.suggest_html || '<div id="shell-suggest"></div>';
    var _suggest_id = config.suggest_id = "#shell-suggest";
    var _blinktime = config.blinktime || 500;
    var _history = config.history || new Josh.History();
    var _readline = config.readline || new Josh.ReadLine({history: _history, console: _console});
    var _active = false;
    var _cursor_visible = false;
    var _itemTemplate = _.template("<div><%- i %>&nbsp;<%- cmd %></div>");
    var _activationHandler;
    var _deactivationHandler;
    var _cmdHandlers = {
      clear: {
        exec: function(cmd, args, callback) {
          $(_input_id).parent().empty();
          callback();
        }
      },
      help: {
        exec: function(cmd, args, callback) {
          var content = $('<div><div><strong>Commands:</strong></div></div>');
          var itemTemplate = _.template('<div>&nbsp;<%=command%></div>');
          _.each(commands(), function(command) {
            content.append(itemTemplate({command: command}))
          });
          callback(content);
        }
      },
      history: {
        exec: function(cmd, args, callback) {
          if(args[0] == "-c") {
            _history.clear();
            callback();
            return;
          }
          var content = $('<div></div>');
          _.each(_history.items(), function(cmd, i) {
            content.append(_itemTemplate({cmd: cmd, i: i}));
          });
          callback(content);
        }
      },
      _default: {
        exec: function(cmd, args, callback) {
          var content = _.template('<div><strong>Unrecognized command:&nbsp;</strong><%=cmd%></div>', {cmd: cmd});
          callback(content);
        },
        completion: function(cmd, arg, line, callback) {
          if(!arg) {
            arg = cmd;
          }
          return callback(self.bestMatch(arg, self.commands()))
        }
      }
    };
    var _line = {
      text: '',
      cursor: 0
    };
    var _searchMatch = '';
    var _view, _panel;
    var _promptHandler;
    var _initializationHandler;
    var _initialized;

    // public methods
    var self = {
      commands: commands,
      isActive: function() {
        return _readline.isActive();
      },
      activate: function() {
        if($(_shell_view_id).length == 0) {
          _active = false;
          return;
        }
        _readline.activate();
      },
      deactivate: function() {
        _console.log("deactivating");
        _active = false;
        _readline.deactivate();
      },
      setCommandHandler: function(cmd, cmdHandler) {
        _cmdHandlers[cmd] = cmdHandler;
      },
      getCommandHandler: function(cmd) {
        return _cmdHandlers[cmd];
      },
      setPrompt: function(prompt) {
        _prompt = prompt;
        if(!_active) {
          return;
        }
        self.refresh();
      },
      onEOT: function(completionHandler) {
        _readline.onEOT(completionHandler);
      },
      onCancel: function(completionHandler) {
        _readline.onCancel(completionHandler);
      },
      onInitialize: function(completionHandler) {
        _initializationHandler = completionHandler;
      },
      onActivate: function(completionHandler) {
        _activationHandler = completionHandler;
      },
      onDeactivate: function(completionHandler) {
        _deactivationHandler = completionHandler;
      },
      onNewPrompt: function(completionHandler) {
        _promptHandler = completionHandler;
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
        _console.log('rendered "' + text + '" w/ cursor at ' + cursorIdx);
      },
      refresh: function() {
        $(_input_id).replaceWith(_input_html);
        self.render();
        _console.log('refreshed ' + _input_id);

      },
      scrollToBottom: function() {
        _panel.animate({scrollTop: _view.height()}, 0);
      },
      bestMatch: function(partial, possible) {
        _console.log("bestMatch on partial '" + partial + "'");
        var result = {
          completion: null,
          suggestions: []
        };
        if(!possible || possible.length == 0) {
          return result;
        }
        var common = '';
        if(!partial) {
          if(possible.length == 1) {
            result.completion = possible[0];
            result.suggestions = possible;
            return result;
          }
          if(!_.every(possible, function(x) {
            return possible[0][0] == x[0]
          })) {
            result.suggestions = possible;
            return result;
          }
        }
        for(var i = 0; i < possible.length; i++) {
          var option = possible[i];
          if(option.slice(0, partial.length) == partial) {
            result.suggestions.push(option);
            if(!common) {
              common = option;
              _console.log("initial common:" + common);
            } else if(option.slice(0, common.length) != common) {
              _console.log("find common stem for '" + common + "' and '" + option + "'");
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
        result.completion = common.substr(partial.length);
        return result;
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
      root.setTimeout(function() {
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
      return _.filter(str.split(/\s+/), function(x) {
        return x;
      });
    }

    function getHandler(cmd) {
      return _cmdHandlers[cmd] || _cmdHandlers._default;
    }

    function renderOutput(output, callback) {
      if(output) {
        $(_input_id).after(output);
      }
      $(_input_id + ' .input .cursor').css('textDecoration', '');
      $(_input_id).removeAttr('id');
      $(_shell_view_id).append(_input_html);
      if(_promptHandler) {
        return _promptHandler(function(prompt) {
          self.setPrompt(prompt);
          return callback();
        });
      }
      return callback();
    }

    function activate() {
      _console.log("activating shell");
      if(!_view) {
        _view = $(_shell_view_id);
      }
      if(!_panel) {
        _panel = $(_shell_panel_id);
      }
      if($(_input_id).length == 0) {
        _view.append(_input_html);
      }
      self.refresh();
      _active = true;
      blinkCursor();
      if(_promptHandler) {
        _promptHandler(function(prompt) {
          self.setPrompt(prompt);
        })
      }
      if(_activationHandler) {
        _activationHandler();
      }
    }

    // init
    _readline.onActivate(function() {
      if(!_initialized) {
        _initialized = true;
        if(_initializationHandler) {
          return _initializationHandler(activate);
        }
      }
      return activate();
    });
    _readline.onDeactivate(function() {
      if(_deactivationHandler) {
        _deactivationHandler();
      }
    });
    _readline.onChange(function(line) {
      _line = line;
      self.render();
    });
    _readline.onClear(function() {
      _cmdHandlers.clear.exec(null, null, function() {
        renderOutput(null, function() {
        });
      });
    });
    _readline.onSearchStart(function() {
      $(_input_id).replaceWith(_search_html);
      _console.log('started search');
    });
    _readline.onSearchEnd(function() {
      $(_input_id).replaceWith(_input_html);
      _searchMatch = null;
      self.render();
      _console.log("ended search");
    });
    _readline.onSearchChange(function(match) {
      _searchMatch = match;
      self.render();
    });
    _readline.onEnter(function(cmdtext, callback) {
      _console.log("got command: " + cmdtext);
      var parts = split(cmdtext);
      var cmd = parts[0];
      var args = parts.slice(1);
      var handler = getHandler(cmd);
      return handler.exec(cmd, args, function(output, cmdtext) {
        renderOutput(output, function() {
          callback(cmdtext)
        });
      });
    });
    _readline.onCompletion(function(line, callback) {
      if(!line) {
        return callback();
      }
      var text = line.text.substr(0, line.cursor);
      var parts = split(text);

      var cmd = parts.shift() || '';
      var arg = parts.pop() || '';
      _console.log("getting completion handler for " + cmd);
      var handler = getHandler(cmd);
      if(handler != _cmdHandlers._default && cmd && cmd == text) {

        _console.log("valid cmd, no args: append space");
        // the text to complete is just a valid command, append a space
        return callback(' ');
      }
      if(!handler.completion) {
        // handler has no completion function, so we can't complete
        return callback();
      }
      _console.log("calling completion handler for " + cmd);
      return handler.completion(cmd, arg, line, function(match) {
        _console.log("completion: " + JSON.stringify(match));
        if(!match) {
          return callback();
        }
        if(match.suggestions && match.suggestions.length > 1) {
          var suggestion = $(_suggest_html);
          for(var i = 0; i < match.suggestions.length; i++) {
            _console.log("suggestion: " + match.suggestions[i]);
            suggestion.append($("<div></div>").text(match.suggestions[i]));
          }
          return renderOutput(suggestion, function() {
            callback(match.completion);
          });
        }
        return callback(match.completion);
      });
    });
    return self;
  }
})(this, $, _);
