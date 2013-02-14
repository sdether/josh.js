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
Josh.Version = "0.2.7";
(function(root) {
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

  Josh.ReadLine = function(config) {
    config = config || {};

    // instance fields
    var _console = config.console || (Josh.Debug && root.console ? root.console : {
      log: function() {
      }
    });
    var _history = config.history || new Josh.History();
    var _deactivationKey = config.deactivationKey || { keyCode: 27 }; // Esc
    var _killring = config.killring || new Josh.KillRing();
    var _active = false;
    var _onActivate;
    var _onDeactivate;
    var _onCompletion;
    var _onEnter;
    var _onChange;
    var _onCancel;
    var _onEOT;
    var _onClear;
    var _onSearchStart;
    var _onSearchEnd;
    var _onSearchChange;
    var _inSearch = false;
    var _searchMatch;
    var _lastSearchText = '';
    var _text = '';
    var _cursor = 0;
    var _lastCmd;
    var _completionActive;
    var _cmdQueue = [];
    var _suspended = false;

    // public methods
    var self = {
      isActive: function() {
        return _active;
      },
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
      onChange: function(changeHandler) {
        _onChange = changeHandler;
      },
      onClear: function(completionHandler) {
        _onClear = completionHandler;
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
      var code = e.keyCode || e.charCode;
      var c = String.fromCharCode(code);
      return {
        code: code,
        character: c,
        shift: e.shiftKey,
        control: e.controlKey,
        alt: e.altKey,
        isChar: true
      };
    }

    function queue(cmd) {
      if(_suspended) {
        _cmdQueue.push(cmd);
        return;
      }
      call(cmd);
    }

    function call(cmd) {
      _console.log('calling: ' + cmd.name + ', previous: ' + _lastCmd);
      if(_inSearch && cmd.name != "cmdKeyPress" && cmd.name != "cmdReverseSearch") {
        _inSearch = false;
        if(cmd.name == 'cmdEsc') {
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
      if(!_inSearch && _killring.isinkill() && cmd.name.substr(0, 7) != 'cmdKill') {
        _killring.commit();
      }
      _lastCmd = cmd.name;
      cmd();
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

    function cmdNoOp() {
      // no-op, used for keys we capture and ignore
    }

    function cmdEsc() {
      // no-op, only has an effect on reverse search and that action was taken in call()
    }

    function cmdBackspace() {
      if(_cursor == 0) {
        return;
      }
      --_cursor;
      _text = remove(_text, _cursor, _cursor + 1);
      refresh();
    }

    function cmdComplete() {
      if(!_onCompletion) {
        return;
      }
      suspend(function(resumeCallback) {
        _onCompletion(self.getLine(), function(completion) {
          if(completion) {
            _text = insert(_text, _cursor, completion);
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
      updateCursor(findBeginningOfPreviousWord());
    }

    function cmdForwardWord() {
      if(_cursor == _text.length) {
        return;
      }
      updateCursor(findEndOfCurrentWord());
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
      _text = remove(_text, _cursor, _cursor + 1);
      refresh();
    }

    function cmdCancel() {
      if(_onCancel) {
        _onCancel();
      }
    }

    function cmdKillToEOF() {
      _killring.append(_text.substr(_cursor));
      _text = _text.substr(0, _cursor);
      refresh();
    }

    function cmdKillWordForward() {
      if(_text.length == 0) {
        return;
      }
      if(_cursor == _text.length) {
        return;
      }
      var end = findEndOfCurrentWord();
      if(end == _text.length - 1) {
        return cmdKillToEOF();
      }
      _killring.append(_text.substring(_cursor, end))
      _text = remove(_text, _cursor, end);
      refresh();
    }

    function cmdKillWordBackward() {
      if(_cursor == 0) {
        return;
      }
      var oldCursor = _cursor;
      _cursor = findBeginningOfPreviousWord();
      _killring.prepend(_text.substring(_cursor, oldCursor));
      _text = remove(_text, _cursor, oldCursor);
      refresh();
    }

    function cmdYank() {
      var yank = _killring.yank();
      if(!yank) {
        return;
      }
      _text = insert(_text, _cursor, yank);
      updateCursor(_cursor + yank.length);
    }

    function cmdRotate() {
      var lastyanklength = _killring.lastyanklength();
      if(!lastyanklength) {
        return;
      }
      var yank = _killring.rotate();
      if(!yank) {
        return;
      }
      var oldCursor = _cursor;
      _cursor = _cursor - lastyanklength;
      _text = remove(_text, _cursor, oldCursor);
      _text = insert(_text, _cursor, yank);
      updateCursor(_cursor + yank.length);
    }

    function cmdClear() {
      if(_onClear) {
        _onClear();
      } else {
        refresh();
      }
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
      _text = insert(_text, _cursor, c);
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
      _console.log("searchtext: " + _searchMatch.term);
      var match = _history.search(_searchMatch.term);
      if(match != null) {
        _searchMatch = match;
        _console.log("match: " + match);
        if(_onSearchChange) {
          _onSearchChange(match);
        }
      }
    }

    function refresh() {
      if(_onChange) {
        _onChange(self.getLine());
      }
    }

    function getHistory(historyCall) {
      _history.update(_text);
      _text = historyCall();
      updateCursor(_text.length);
    }

    function findBeginningOfPreviousWord() {
      var position = _cursor - 1;
      if(position < 0) {
        return 0;
      }
      var word = false;
      for(var i = position; i > 0; i--) {
        var word2 = isWordChar(_text[i]);
        if(word && !word2) {
          return i + 1;
        }
        word = word2;
      }
      return 0;
    }

    function findEndOfCurrentWord() {
      if(_text.length == 0) {
        return 0;
      }
      var position = _cursor + 1;
      if(position >= _text.length) {
        return _text.length - 1;
      }
      var word = false;
      for(var i = position; i < _text.length; i++) {
        var word2 = isWordChar(_text[i]);
        if(word && !word2) {
          return i;
        }
        word = word2;
      }
      return _text.length - 1;
    }

    function isWordChar(c) {
      if(c == undefined) {
        return false;
      }
      var code = c.charCodeAt(0);
      return (code >= 48 && code <= 57)
        || (code >= 65 && code <= 90)
        || (code >= 97 && code <= 122);
    }

    function remove(text, from, to) {
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
    }

    function insert(text, idx, ins) {
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


    // set up key capture
    root.onkeydown = function(e) {
      e = e || window.event;

      // return as unhandled if we're not active or the key is just a modifier key
      if(!_active || e.keyCode == 16 || e.keyCode == 17 || e.keyCode == 18 || e.keyCode == 91) {
        return true;
      }

      var cmd = null;

      // check for some special first keys, regardless of modifiers
      switch(e.keyCode) {
        case 8:  // Backspace
          cmd = cmdBackspace;
          break;
        case 9:  // Tab
          cmd = cmdComplete;
          break;
        case 13: // Enter
          cmd = cmdDone;
          break;
        case 27: // Esc
          cmd = cmdEsc;
          break;
        case 33: // Page Up
          cmd = cmdHistoryTop;
          break;
        case 34: // Page Down
          cmd = cmdHistoryEnd;
          break;
        case 35: // End
          cmd = cmdEnd;
          break;
        case 36: // Home
          cmd = cmdHome;
          break;
        case 37: // Left
          cmd = cmdLeft;
          break;
        case 38: // Up
          cmd = cmdHistoryPrev;
          break;
        case 39: // Right
          cmd = cmdRight;
          break;
        case 40: // Down
          cmd = cmdHistoryNext;
          break;
        case 46: // Delete
          cmd = cmdDeleteChar;
          break;

        // these we catch and have no commands for
        case 10: // Pause
        case 19: // Caps Lock
        case 45: // Insert
          cmd = cmdNoOp;
          break;

        // all others we don't handle at this level
        default:
          break;
      }

      // intercept ctrl- and meta- sequences (may override the non-modifier cmd captured above
      if(e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
        switch(e.keyCode) {
          case 65: // A
            cmd = cmdHome;
            break;
          case 66: // B
            cmd = cmdLeft;
            break;
          case 67: // C
            cmd = cmdCancel;
            break;
          case 68: // D
            cmd = cmdDeleteChar;
            break;
          case 69: // E
            cmd = cmdEnd;
            break;
          case 70: // F
            cmd = cmdRight;
            break;
          case 80: // P
            cmd = cmdHistoryPrev;
            break;
          case 78: // N
            cmd = cmdHistoryNext;
            break;
          case 75: // K
            cmd = cmdKillToEOF;
            break;
          case 89: // Y
            cmd = cmdYank;
            break;
          case 76: // L
            cmd = cmdClear;
            break;
          case 82: // R
            cmd = cmdReverseSearch;
            break;
        }
      } else if((e.altKey || e.metaKey) && !e.ctrlKey && !e.shiftKey) {
        switch(e.keyCode) {
          case 8:  // Backspace
            cmd = cmdKillWordBackward;
            break;
          case 66: // B
            cmd = cmdBackwardWord;
            break;
          case 68: // D
            cmd = cmdKillWordForward;
            break;
          case 70: // F
            cmd = cmdForwardWord;
            break;
          case 89: // Y
            cmd = cmdRotate;
            break;
        }
      }
      if(!cmd) {
        return true;
      }
      queue(cmd);
      e.preventDefault();
      e.stopPropagation();
      e.cancelBubble = true;
      return false;
    };

    root.onkeypress = function(e) {
      if(!_active) {
        return true;
      }
      var key = getKeyInfo(e);
      if(key.code == 0 || e.defaultPrevented) {
        return false;
      }
      queue(function cmdKeyPress() {
        if(_inSearch) {
          addSearchText(key.character);
        } else {
          addText(key.character);
        }
      });
      e.preventDefault();
      e.stopPropagation();
      e.cancelBubble = true;
      return false;
    };

    return self;
  };
})(this);


