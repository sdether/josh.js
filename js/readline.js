(function () {
  ReadlineCurrentPress = null;


  ReadLine = function (window, document) {

    // instance vars
    var _active = false;
    var _onCompletion;
    var _onEnter;
    var _onKeydown;
    var _onChange;
    var _line = '';
    var _pos = 0;
    var _capsLock = false;

    // set up key capture
    document.onkeydown = function (e) {
      e = e || window.event
      console.log("keydown - code: ", e.keyCode);
      if(e.keyCode == 20) {

        // this is a guess at best.. keypress is the true arbiter, but it can only detect after the keydown has already happened
        // and keypress doesn't detect the actual caps-lock itself
        _capsLock = !_capsLock;
      }
      if (!_active) {
        return true;
      }
      var info = getKeyInfo(e);
      if (_onKeydown) {
        _onKeydown(info);
      }
      ReadlineCurrentPress = e;
      if (info.isChar) {
        _line += info.char;
        ++_pos;
        if (_onChange) {
          _onChange({
            text:_line,
            pos:_pos
          });
        }
      }
//      if (e.preventDefault) {
//        e.preventDefault();
//      }
      return true;
    };
    document.onkeypress = function (e) {
      if ((e.keyCode >= 97 && e.keyCode <= 122 && e.shiftKey) || (e.keyCode >= 65 && e.keyCode <= 90 && !e.shiftKey)) {
        _capsLock = true;
      } else {
        _capsLock = false;
      }
      console.log("keypress - code: "+ e.keyCode + ", shift: "+ e.shiftKey +", caps-lock: "+ _capsLock);
      if (!_active) {
        return true;
      }
      e.preventDefault();
      return false;
    };
    document.onkeyup = KeyCode.key_up;
//  document.onkeypress = function (e) {
//    if (!_active) {
//      return true;
//    }
//    var c = String.fromCharCode(e.keyCode)
//    if (_onKeydown) {
//      _onKeydown({
//      });
//    }
//    ReadlineCurrentPress = e;
//    ++_pos;
//    if (_onChange) {
//      _onChange({
//        text:_line,
//        pos:_pos
//      });
//    }
//    e.preventDefault();
//    return false;
//  };

    // instance methods
    function getKeyInfo(e) {
      var info = {
        code:e.keyCode,
        shift:e.shiftKey,
        control:e.controlKey,
        alt:e.altKey,
        capsLock:_capsLock,
        isChar: false
      };
      var code = info.code;
      if ((_capsLock && info.shift) || (!_capsLock && !info.shift)) {
        code = SHIFTED[code] || code;
      }
      info.name = SPECIAL[code];
      var char = String.fromCharCode(code);
      if (char) {
        info.char = char;
        info.isChar = char;
        info.name = char;
      }
      return info;
    }

    // build object
    return {
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
    }
  }
})();