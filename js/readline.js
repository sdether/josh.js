(function() {
  var SPECIAL = {
    8: 'BACKSPACE',
    9: 'TAB',
    13: 'ENTER',
    19: 'PAUSE',
    20: 'CAPS_LOCK',
    27: 'ESCAPE',
    32: 'SPACE',
    33: 'PAGE_UP',
    34: 'PAGE_DOWN',
    35: 'END',
    36: 'HOME',
    37: 'LEFT',
    38: 'UP',
    39: 'RIGHT',
    40: 'DOWN',
    45: 'INSERT',
    46: 'DELETE'
  };

  ReadLine = function(config) {
    config = config || {};

    // instance fields
    var _window = config.window || window;
    var _document = config.document || document;
    var _history = config.history || new ReadLine.History();
    var _activationKey = config.activationKey || { keyCode: 192, shiftKey: true };
    var _deactivationKey = config.deactivationKey || { keyCode: 27 };
    var _active = false;
    var _onActivate;
    var _onDeactivate;
    var _onCompletion;
    var _onEnter;
    var _onKeydown;
    var _onChange;
    var _onCancel;
    var _onEOT;
    var _onSearchStart;
    var _onSearchEnd;
    var _onSearchChange;
    var _inSearch = false;
    var _searchMatch;
    var _lastSearchText = '';
    var _text = '';
    var _cursor = 0;
    var _strUtil = ReadLine.StrUtil;
    var _kill_buffer = '';
    var _lastCmd;
    var _completionActive;
    var _cmdQueue = [];
    var _suspended = false;

    // public methods
    var self = {
      activate: function() {
        _active = true;
        if(_onActivate) {
          _onActivate();
        }
      },
      deactivate: function() {
        _active = false;
        if(_onDeactivate) {
          _onDeactivate();
        }
      },
      onActivate: function(completionHandler) {
        _onActivate = completionHandler;
      },
      onDeactivate: function(completionHandler) {
        _onDeactivate = completionHandler;
      },
      onKeydown: function(keydownHandler) {
        _onKeydown = keydownHandler;
      },
      onChange: function(changeHandler) {
        _onChange = changeHandler;
      },
      onEnter: function(enterHandler) {
        _onEnter = enterHandler;
      },
      onCompletion: function(completionHandler) {
        _onCompletion = completionHandler;
      },
      onCancel: function(completionHandler) {
        _onCancel = completionHandler;
      },
      onEOT: function(completionHandler) {
        _onEOT = completionHandler;
      },
      onSearchStart: function(completionHandler) {
        _onSearchStart = completionHandler;
      },
      onSearchEnd: function(completionHandler) {
        _onSearchEnd = completionHandler;
      },
      onSearchChange: function(completionHandler) {
        _onSearchChange = completionHandler;
      },
      getLine: function() {
        return {
          text: _text,
          cursor: _cursor
        };
      }
    };

    // private methods
    function getKeyInfo(e) {
      var info = {
        code: e.keyCode,
        shift: e.shiftKey,
        control: e.controlKey,
        alt: e.altKey,
        isChar: true
      };
      var code = info.code;
      var c = String.fromCharCode(code);
      info.name = SPECIAL[code] || c;
      info.char = c;
      return info;
    }

    function queue(cmd) {
      if(_suspended) {
        _cmdQueue.push(cmd);
        return;
      }
      call(cmd);
    }

    function call(cmd) {
      console.log('calling: ' + cmd.name + ', previous: ' + _lastCmd);
      if(_inSearch && cmd.name != "cmdKeyPress" && cmd.name != "cmdReverseSearch") {
        _inSearch = false;
        if(cmd.name == 'cmdCancelSearch') {
          _searchMatch = null;
        }
        if(_searchMatch) {
          if(_searchMatch.text) {
            _cursor = _searchMatch.cursoridx;
            _text = _searchMatch.text;
            _history.applySearch();
          }
          _searchMatch = null;
        }
        if(_onSearchEnd) {
          _onSearchEnd();
        }
      }
      _lastCmd = cmd.name;
      cmd();
    }

    function cmdCancelSearch() {
      // do nothing.. action for this was already taken in call()
    }

    function cmdBackspace() {
      if(_cursor == 0) {
        return;
      }
      --_cursor;
      _text = _strUtil.remove(_text, _cursor, _cursor + 1);
      refresh();
    }

    function cmdComplete() {
      if(!_onCompletion) {
        return;
      }
      suspend(function(resumeCallback) {
        _onCompletion(self.getLine(), function(completion) {
          if(completion) {
            _text = _strUtil.insert(_text, _cursor, completion);
            updateCursor(_cursor + completion.length);
          }
          _completionActive = true;
          resumeCallback();
        });
      });
    }

    function cmdDone() {
      if(!_text) {
        return;
      }
      var text = _text;
      _history.accept(text);
      _text = '';
      _cursor = 0;
      if(!_onEnter) {
        return;
      }
      suspend(function(resumeCallback) {
        _onEnter(text, function(text) {
          if(text) {
            _text = text;
            _cursor = _text.length;
          }
          if(_onChange) {
            _onChange(self.getLine());
          }
          resumeCallback();
        });
      });

    }

    function suspend(asyncCall) {
      _suspended = true;
      asyncCall(resume);
    }

    function resume() {
      var cmd = _cmdQueue.shift();
      if(!cmd) {
        _suspended = false;
        return;
      }
      call(cmd);
      resume();
    }

    function cmdEnd() {
      updateCursor(_text.length);
    }

    function cmdHome() {
      updateCursor(0);
    }

    function cmdLeft() {
      if(_cursor == 0) {
        return;
      }
      updateCursor(_cursor - 1);
    }

    function cmdRight() {
      if(_cursor == _text.length) {
        return;
      }
      updateCursor(_cursor + 1);
    }

    function cmdBackwardWord() {
      if(_cursor == 0) {
        return;
      }
      var previousWhitespace = 0;
      var findNonWhiteSpace = _text[_cursor] == ' ' || _text[_cursor - 1] == ' ';
      for(var i = _cursor - 1; i > 0; i--) {
        if(findNonWhiteSpace) {
          if(_text[i] != ' ') {
            findNonWhiteSpace = false;
          }
        } else {
          if(_text[i] == ' ') {
            previousWhitespace = i + 1;
            break;
          }
        }
      }
      updateCursor(previousWhitespace);
    }

    function cmdForwardWord() {
      if(_cursor == _text.length) {
        return;
      }
      var nextWhitespace = _text.length;
      var findNonWhitespace = _text[_cursor] == ' ';
      for(var i = _cursor + 1; i < _text.length; i++) {
        if(findNonWhitespace) {
          if(_text[i] != ' ') {
            findNonWhitespace = false;
          }
        } else {
          if(_text[i] == ' ') {
            nextWhitespace = i;
            break;
          }
        }
      }
      updateCursor(nextWhitespace);
    }

    function cmdHistoryPrev() {
      if(!_history.hasPrev()) {
        return;
      }
      getHistory(_history.prev);
    }

    function cmdHistoryNext() {
      if(!_history.hasNext()) {
        return;
      }
      getHistory(_history.next);
    }

    function cmdHistoryTop() {
      getHistory(_history.top);
    }

    function cmdHistoryEnd() {
      getHistory(_history.end);
    }

    function cmdDeleteChar() {
      if(_text.length == 0) {
        if(_onEOT) {
          _onEOT();
          return;
        }
      }
      if(_cursor == _text.length) {
        return;
      }
      _text = _strUtil.remove(_text, _cursor, _cursor + 1);
      refresh();
    }

    function cmdCancel() {
      if(_onCancel) {
        _onCancel();
      }
    }

    function cmdKillToEOF() {
      _kill_buffer = _text.substr(_cursor);
      _text = _text.substr(0, _cursor);
      refresh();
    }

    function cmdYank() {
      _text = _strUtil.insert(_text, _cursor, _kill_buffer);
      updateCursor(_cursor + _kill_buffer.length);
    }

    function cmdRefresh() {
      refresh();
    }

    function cmdReverseSearch() {
      if(!_inSearch) {
        _inSearch = true;
        if(_onSearchStart) {
          _onSearchStart();
        }
        if(_onSearchChange) {
          _onSearchChange({});
        }
      } else {
        if(!_searchMatch) {
          _searchMatch = {term: ''};
        }
        search();
      }
    }

    function updateCursor(position) {
      _cursor = position;
      refresh();
    }

    function addText(c) {
      _text = _strUtil.insert(_text, _cursor, c);
      ++_cursor;
      refresh();
    }

    function addSearchText(c) {
      if(!_searchMatch) {
        _searchMatch = {term: ''};
      }
      _searchMatch.term += c;
      search();
    }

    function search() {
      console.log("searchtext: " + _searchMatch.term);
      var match = _history.search(_searchMatch.term);
      if(match != null) {
        _searchMatch = match;
        console.log("match: " + match);
        if(_onSearchChange) {
          _onSearchChange(match);
        }
      }
    }

    function refresh() {
      if(_completionActive) {
        _completionActive = false;
        if(_onCompletion) {
          _onCompletion();
        }
      }
      if(_onChange) {
        _onChange(self.getLine());
      }
    }

    function getHistory(historyCall) {
      _history.update(_text);
      _text = historyCall();
      updateCursor(_text.length);
    }

    function checkKeyMatch(a, b) {
      return a.keyCode == b.keyCode
        && Boolean(a.shiftKey) == Boolean(b.shiftKey)
        && Boolean(a.ctrlKey) == Boolean(b.ctrlKey)
        && Boolean(a.altKey) == Boolean(b.altKey);
    }

    // set up key capture
    document.onkeydown = function(e) {
      e = e || window.event;

      // check if the keypress is an the activation key
      if(!_active && checkKeyMatch(e, _activationKey)) {
        self.activate();
        return false;
      }

      // return as unhandled if we're not active or the key is just a modifier key
      if(!_active || e.keyCode == 16 || e.keyCode == 17 || e.keyCode == 18) {
        return true;
      }

      var handled = true;

      // check keys special keys, regardless of modifiers
      switch(e.keyCode) {
        case 8:  // Backspace
          queue(cmdBackspace);
          break;
        case 9:  // Tab
          queue(cmdComplete);
          break;
        case 13: // Enter
          queue(cmdDone);
          break;
        case 27: // Esc
          if(_inSearch) {
            queue(cmdCancelSearch);
          } else {
            handled = false;
          }
          break;
        case 33: // Page Up
          queue(cmdHistoryTop);
          break;
        case 34: // Page Down
          queue(cmdHistoryEnd);
          break;
        case 35: // End
          queue(cmdEnd);
          break;
        case 36: // Home
          queue(cmdHome);
          break;
        case 37: // Left
          queue(cmdLeft);
          break;
        case 38: // Up
          queue(cmdHistoryPrev);
          break;
        case 39: // Right
          queue(cmdRight);
          break;
        case 40: // Down
          queue(cmdHistoryNext);
          break;
        case 46: // Delete
          queue(cmdDeleteChar);
          break;

        // these we catch and have no commands for
        case 10: // Pause
        case 19: // Caps Lock
        case 45: // Insert
          break;

        // all others we don't handle at this level
        default:
          handled = false;
          break;
      }
      if(!handled) {

        // intercept ctrl- and alt- sequences
        if(e.ctrlKey && !e.shiftKey && !e.altKey) {
          switch(e.keyCode) {
            case 65: // A
              queue(cmdHome);
              handled = true;
              break;
            case 66: // B
              queue(cmdLeft);
              handled = true;
              break;
            case 67: // C
              queue(cmdCancel);
              handled = true;
              break;
            case 68: // D
              queue(cmdDeleteChar);
              handled = true;
              break;
            case 69: // E
              queue(cmdEnd);
              handled = true;
              break;
            case 70: // F
              queue(cmdRight);
              handled = true;
              break;
            case 80: // P
              queue(cmdHistoryPrev);
              handled = true;
              break;
            case 78: // N
              queue(cmdHistoryNext);
              handled = true;
              break;
            case 75: // K
              queue(cmdKillToEOF);
              handled = true;
              break;
            case 89: // Y
              queue(cmdYank);
              handled = true;
              break;
            case 76: // L
              queue(cmdRefresh);
              handled = true;
              break;
            case 82: // R
              queue(cmdReverseSearch);
              handled = true;
              break;
          }
        } else if(e.altKey && !e.ctrlKey && !e.shiftKey) {
          switch(e.keyCode) {
            case 66: // B
              queue(cmdBackwardWord);
              handled = true;
              break;
            case 70: // F
              queue(cmdForwardWord);
              handled = true;
              break;
          }
        }
      }
      if(!handled) {
        if(checkKeyMatch(e, _deactivationKey)) {
          self.deactivate();
          return false;
        }
        return true;
      }
      var info = getKeyInfo(e);
      if(_onKeydown) {
        _onKeydown({
          code: e.keyCode,
          shift: e.shiftKey,
          control: e.controlKey,
          alt: e.altKey,
          name: SPECIAL[e.keyCode],
          isChar: false
        });
      }
      e.preventDefault();
      return false;
    };
    document.onkeypress = function(e) {
      if(!_active) {
        return true;
      }

      var key = getKeyInfo(e);
      queue(function cmdKeyPress() {
        if(_inSearch) {
          addSearchText(key.char);
        } else {
          addText(key.char);
        }
        if(_onKeydown) {
          _onKeydown(key);
        }
      });
      e.preventDefault();
      return false;
    };

    return self;
  };

  ReadLine.StrUtil = {
    remove: function(text, from, to) {
      if(text.length <= 1 || text.length <= to - from) {
        return '';
      }
      if(from == 0) {

        // delete leading characters
        return text.substr(to);
      }
      var left = text.substr(0, from);
      var right = text.substr(to);
      return left + right;
    },
    insert: function(text, idx, ins) {
      if(idx == 0) {
        return ins + text;
      }
      if(idx >= text.length) {
        return text + ins;
      }
      var left = text.substr(0, idx);
      var right = text.substr(idx);
      return left + ins + right;
    }
  };

  ReadLine.History = function(config) {
    config = config || {};

    var _history = config.history || [''];
    var _cursor = config.cursor || 0;
    var _searchCursor = _cursor;
    var _lastSearchTerm = '';
    var _storage = config.storage;
    var _key = config.key || 'readline.history';

    if(_storage) {
      var data = _storage.getItem(_key);
      if(data) {
        _history = JSON.parse(data);
        _searchCursor = _cursor = _history.length - 1;
      } else {
        save();
      }
    }
    function save() {
      if(_storage) {
        _storage.setItem(_key, JSON.stringify(_history));
      }
    }

    function setHistory() {
      _searchCursor = _cursor;
      _lastSearchTerm = '';
      return _history[_cursor];
    }

    return {
      update: function(text) {
        console.log("updating history to " + text);
        _history[_cursor] = text;
        save();
      },
      accept: function(text) {
        console.log("accepting history " + text);
        var last = _history.length - 1;
        if(text) {
          if(_cursor == last) {
            console.log("we're at the end already, update last position");
            _history[_cursor] = text;
          } else if(!_history[last]) {
            console.log("we're not at the end, but the end was blank, so update last position");
            _history[last] = text;
          } else {
            console.log("appending to end");
            _history.push(text);
          }
          _history.push('');
        }
        _searchCursor = _cursor = _history.length - 1;
        save();
      },
      items: function() {
        return _history.slice(0, _history.length - 1);
      },
      clear: function() {
        _history = [_history[_history.length - 1]];
        save();
      },
      hasNext: function() {
        return _cursor < (_history.length - 1);
      },
      hasPrev: function() {
        return _cursor > 0;
      },
      prev: function() {
        --_cursor;
        return setHistory();
      },
      next: function() {
        ++_cursor;
        return setHistory();
      },
      top: function() {
        _cursor = 0;
        return setHistory();
      },
      end: function() {
        _cursor = _history.length - 1;
        return setHistory();
      },
      search: function(term) {
        if(!term && !_lastSearchTerm) {
          return null;
        }
        var iterations = _history.length;
        if(term == _lastSearchTerm) {
          _searchCursor--;
          iterations--;
        }
        if(!term) {
          term = _lastSearchTerm;
        }
        _lastSearchTerm = term;
        for(var i = 0; i < iterations; i++) {
          if(_searchCursor < 0) {
            _searchCursor = _history.length - 1;
          }
          var idx = _history[_searchCursor].indexOf(term);
          if(idx != -1) {
            return {
              text: _history[_searchCursor],
              cursoridx: idx,
              term: term
            };
          }
          _searchCursor--;
        }
        return null;
      },
      applySearch: function() {
        if(_lastSearchTerm) {
          console.log("setting history to position" + _searchCursor + "(" + _cursor + "): " + _history[_searchCursor]);
          _cursor = _searchCursor;
          return _history[_cursor];
        }
        return null;
      }
    };
  };
})();


