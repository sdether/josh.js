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

    // instance fields
    var _active = false;
    var _onCompletion;
    var _onEnter;
    var _onKeydown;
    var _onChange;
    var _text = '';
    var _cursor = 0;
    var _strUtil = ReadLine.StrUtil;

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

        // intercept ctrl- and alt- sequences
        if (e.ctrlKey && !e.shiftKey && !e.altKey) {
          switch (e.keyCode) {
            case 65: // A
              cmdHome();
              handled = true;
              break;
            case 69: // E
              cmdEnd();
              handled = true;
              break;
            case 66: // B
              cmdLeft();
              handled = true;
              break;
            case 70: // F
              cmdRight();
              handled = true;
              break;
            case 80: // P
              cmdHistoryPrev();
              handled = true;
              break;
            case 78: // N
              cmdHistoryNext();
              handled = true;
              break;
            case 75: // K
              cmdKillToEOF();
              handled = true;
              break;
            case 89: // Y
              cmdYank();
              handled = true;
              break;
            case 68: // D
              cmdDeleteChar();
              handled = true;
              break;
            case 76: // L
              cmdRefresh();
              handled = true;
              break;
            case 82: // R
              cmdReverseSearch();
              handled = true;
              break;
          }
        } else if (e.altKey && !e.ctrlKey && !e.shiftKey) {
          switch (e.keyCode) {
            case 66: // B
              cmdBackwardWord();
              handled = true;
              break;
            case 70: // F
              cmdForwardWord();
              handled = true;
              break;
          }
        }
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
      addText(key.char);
      if (_onKeydown) {
        _onKeydown(key);
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
      --_cursor;
      _text = _strUtil.remove(_text, _cursor, _cursor + 1);
      updateCursor(_cursor);
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
      if (_cursor == 0) {
        return;
      }
      updateCursor(_cursor - 1);
    }

    function cmdHistoryPrev() {

    }

    function cmdRight() {
      if (_cursor == _text.length) {
        return;
      }
      updateCursor(_cursor + 1);
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
      _cursor = position;
      refresh();
    }

    function addText(c) {
      _text = _strUtil.insert(_text, _cursor, c);
      ++_cursor;
      refresh();
    }

    function refresh() {
      if (_onChange) {
        _onChange({
          text:_text,
          cursor:_cursor
        });
      }
    }

    return self
  };

  ReadLine.StrUtil = {
    remove:function (text, from, to) {
      if (text.length <= 1 || text.length <= to - from) {
        return '';
      }
      if (to == text.length - 1) {

        // delete trailing characters
        return text.substr(0, text.length - from);
      }
      if (from == 0) {

        // delete leading characters
        return text.substr(to);
      }
      var left = text.substr(0, from);
      var right = text.substr(to);
      return left + right;
    },
    insert:function (text, idx, ins) {
      if (idx == 0) {
        return ins + text;
      }
      if (idx >= text.length) {
        return text + ins;
      }
      var left = text.substr(0, idx);
      var right = text.substr(idx);
      return left + ins + right;
    }
  };

})();


