(function ($,document,window) {
  Shell = function (config) {

    // instance fields
    var _prompt = config.prompt || 'jsh$';
    var _input_id = config.input_id || '#shell-cli';
    var _blinktime = config.blinktime || 500;
    var _readline = config.readline;
    var _active = false;
    var _cursor_visible = false;
    var _line = {
      text:'',
      cursor:0
    };

    // public methods
    var self = {
      activate:function () {
        self.refresh();
        _active = true;
        _readline.activate();
        blinkCursor();
      },
      deactivate:function () {
        _active = false;
        _readline.deactivate();
      },
      setPrompt:function (prompt) {
        _prompt = prompt;
        if(!_active) {
          return;
        }
        self.refresh();
      },
      setInput:function (text, cursor) {
        _line = {text:text, cursor:cursor};
        if(!_active) {
          return;
        }
        self.refresh();
      },
      render:function () {
        var left = _line.text.substr(0, _line.cursor);
        var cursor = _line.text.substr(_line.cursor, 1);
        var right = _line.text.substr(_line.cursor + 1);
        $(_input_id + ' .input .left').text(left);
        if(!cursor) {
          $(_input_id + ' .input .cursor').html('&nbsp;').css('textDecoration', 'underline');
        } else {
          $(_input_id + ' .input .cursor').text(cursor).css('textDecoration', 'underline');
        }
        $(_input_id + ' .input .right').text(right);
        _cursor_visible = true;
        console.log('rendered "' + _line.text + '" w/ cursor at ' + _line.cursor);
      },
      refresh:function () {
        $(_input_id+' .prompt').text(_prompt);
        $(_input_id+' .input').html('<span class="left"/><span class="cursor"/><span class="right"/>');
        self.render();
        console.log('refreshed '+_input_id);
      }
    };

    function blinkCursor() {
      if(!_active) {
        return;
      }
      window.setTimeout(function(){
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
      },_blinktime);
    }

    // init
    _readline.onChange(function (line) {
      _line = line;
      self.render();
    });
    return self;
  };
})(jQuery,document,window);
