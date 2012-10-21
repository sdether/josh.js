(function () {
  var SPECIAL = {
    8:'BACKSPACE',
    9:'TAB',
    13:'ENTER',
    19:'PAUSE',
    20:'CAPS_LOCK',
    27:'ESCAPE',
    32:'SPACE',
    33:'PAGE_UP',
    34:'PAGE_DOWN',
    35:'END',
    36:'HOME',
    37:'LEFT',
    38:'UP',
    39:'RIGHT',
    40:'DOWN',
    45:'INSERT',
    46:'DELETE'
  };

  ReadLine = function (window, document) {

    // instance vars
    var _active = false;
    var _onCompletion;
    var _onEnter;
    var _onKeydown;
    var _onChange;
    var _text = '';
    var _cursor = 0;

    // set up key capture
    document.onkeydown = function (e) {
      e = e || window.event
      if (!_active) {
        return true;
      }
      console.log("keydown - code: " + e.keyCode);
      var handled = true;
      switch (e.keyCode) {
        case 8:  // Backspace
          cmdBackpace();
          break;
        case 9:  // Tab
          cmdComplete();
          break;
        case 13: // Enter
          cmdDone();
          break;
        case 35: // End
          cmdEnd();
          break;
        case 36: // Home
          cmdHome();
          break;
        case 37: // Left
          cmdLeft();
          break;
        case 38: // Up
          cmdHistoryPrev();
          break;
        case 39: // Right
          cmdRight();
          break;
        case 40: // Down
          cmdHistoryNext();
          break;
        case 46: // Delete
          cmdDeleteChar();
          break;

        // these we catch and have no commands for
        case 10: // Pause
        case 19: // Caps Lock
        case 27: // Esc
        case 33: // Page Up
        case 34: // Page Down
        case 45: // Insert

        // all others we don't handle at this level
        default:
          handled = false;
          break;
      }
      if (!handled) {
        return true;
      }
      var info = getKeyInfo(e);
      if (_onKeydown) {
        _onKeydown({
          code:e.keyCode,
          shift:e.shiftKey,
          control:e.controlKey,
          alt:e.altKey,
          name:SPECIAL[e.keyCode],
          isChar:false
        });
      }
      e.preventDefault();
      return false;
    };
    document.onkeypress = function (e) {
      if (!_active) {
        return true;
      }
      console.log("keypress - code: " + e.keyCode + ", char: " + String.fromCharCode(e.keyCode) + ", ctrl: " + e.ctrlKey);
      var key = getKeyInfo(e);
      if (key.control && !key.shift && !key.alt) {
        switch (key.char) {
          case 'A':
          case 'a':
            cmdHome();
            break;
          case 'E':
          case 'e':
            cmdEnd();
            break;
          case 'B':
          case 'b':
            cmdLeft();
            break;
          case 'F':
          case 'f':
            cmdRight();
            break;
          case 'P':
          case 'p':
            cmdHistoryPrev();
            break;
          case 'N':
          case 'n':
            cmdHistoryNext();
            break;
          case 'K':
          case 'k':
            cmdKillToEOF();
            break;
          case 'Y':
          case 'y':
            cmdYank();
            break;
          case 'D':
          case 'd':
            cmdDeleteChar();
            break;
          case 'L':
          case 'l':
            cmdRefresh();
            break;
          case 'R':
          case 'r':
            cmdReverseSearch();
            break;
        }
      } else if (key.Alt && !key.ctrl && !key.shift) {
        switch (key.code) {
          case 'B':
          case 'b':
            cmdBackwardWord();
            break;
          case 'F':
          case 'f':
            cmdForwardWord();
        }
      } else if (key.ctrl || key.alt) {

        // no handlers
      } else {
        if (_onKeydown) {
          _onKeydown(key);
        }
        _text += key.char;
        ++_cursor;
        if (_onChange) {
          _onChange({
            text:_text,
            pos:_cursor
          });
        }
      }
      e.preventDefault();
      return false;
    };

    // public methods
    var self = {
      activate:function () {
        _active = true;
      },
      deactivate:function () {
        _active = false;
      },
      onKeydown:function (callback) {
        _onKeydown = callback;
      },
      onChange:function (callback) {
        _onChange = callback;
      }
    };

    // private methods
    function getKeyInfo(e) {
      var info = {
        code:e.keyCode,
        shift:e.shiftKey,
        control:e.controlKey,
        alt:e.altKey,
        isChar:true
      };
      var code = info.code;
      var c = String.fromCharCode(code);
      info.name = SPECIAL[code] || c;
      info.char = c;
      return info;
    }

    function cmdBackpace() {
      if (_cursor == 0) {
        return;
      }
      _text = _text.substr(0, _cursor - 1) + _text.substr(_cursor, _text.length - _cursor);
      updateCursor(_cursor - 1);
    }

    function cmdComplete() {

    }

    function cmdDone() {
      if (_onEnter) {
        _onEnter(_text);
      }
      _text = '';
      _cursor = 0;
    }

    function cmdEnd() {

      updateCursor(_text.length);
    }

    function cmdHome() {
      updateCursor(0);
    }

    function cmdLeft() {
      if (_cursor = 0) {
        return;
      }
      updateCursor(cursor - 1);
    }

    function cmdHistoryPrev() {

    }

    function cmdRight() {
      if(_cursor == _text.length) {
        return;
      }
      updateCursor(_cursor+ 1);
    }

    function cmdHistoryNext() {

    }

    function cmdDeleteChar() {

    }

    function cmdKillToEOF() {
    }

    function cmdYank() {

    }

    function cmdRefresh() {

    }

    function cmdReverseSearch() {

    }

    function cmdBackwardWord() {

    }

    function cmdForwardWord() {

    }

    function updateCursor(position) {

    }

    return self
  }
})();