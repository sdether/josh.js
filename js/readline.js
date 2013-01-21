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
    var _activationKey = config.activationKey || { keyCode: 192, shiftKey: true }; // ~
    var _deactivationKey = config.deactivationKey || { keyCode: 27 }; // Esc
    var _killring = config.killring || new Josh.KillRing();
    var _active = false;
    var _onActivate;
    var _onDeactivate;
    var _onCompletion;
    var _onEnter;
    var _onKeydown;
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

    function cmdCancelSearch() {
      // do nothing.. action for this was already taken in call()
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
        if(_onEOT) {
          _onEOT();
          return;
        }
      }
      if(_cursor == _text.length) {
        return;
      }
      var end = findEndOfCurrentWord();
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

    function checkKeyMatch(a, b) {
      return a.keyCode == b.keyCode
        && Boolean(a.shiftKey) == Boolean(b.shiftKey)
        && Boolean(a.ctrlKey) == Boolean(b.ctrlKey)
        && Boolean(a.altKey) == Boolean(b.altKey);
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

      // check if the keypress is an the activation key
      if(!_active && checkKeyMatch(e, _activationKey)) {
        self.activate();
        return false;
      }

      // return as unhandled if we're not active or the key is just a modifier key
      if(!_active || e.keyCode == 16 || e.keyCode == 17 || e.keyCode == 18 || e.keyCode == 91) {
        return true;
      }

      var handled = true;

      // check for some special keys, regardless of modifiers
      switch(e.keyCode) {
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

        // intercept ctrl- and meta- sequences
        if(e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
          switch(e.keyCode) {
            case 8:  // Backspace

              // Backspace behaves the same with or without Ctrl, but different for meta
              queue(cmdBackspace);
              handled = true;
              break;
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
              queue(cmdClear);
              handled = true;
              break;
            case 82: // R
              queue(cmdReverseSearch);
              handled = true;
              break;
          }
        } else if((e.altKey || e.metaKey) && !e.ctrlKey && !e.shiftKey) {
          switch(e.keyCode) {
            case 8:  // Backspace
              queue(cmdKillWordBackward);
              handled = true;
              break;
            case 66: // B
              queue(cmdBackwardWord);
              handled = true;
              break;
            case 68: // D
              queue(cmdKillWordForward);
              handled = true;
              break;
            case 70: // F
              queue(cmdForwardWord);
              handled = true;
              break;
            case 89: // Y
              queue(cmdRotate);
              handled = true;
              break;
         }
        } else {

          // check for some more special keys without Ctrl or Alt
          switch(e.keyCode) {
            case 8:  // Backspace
              queue(cmdBackspace);
              handled = true;
              break;
          }
        }
      }
      if(!handled) {
        if(!checkKeyMatch(e, _deactivationKey)) {
          return true;
        }
        self.deactivate();
      } else {
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
      }
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
        if(_onKeydown) {
          _onKeydown(key);
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


