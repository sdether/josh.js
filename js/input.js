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
(function (root, $, _) {
  $.fn.josh_caretTo = function (index) {
    return this.queue(function (next) {
      if (this.createTextRange) {
        var range = this.createTextRange();
        range.move("character", index);
        range.select();
      } else if (this.selectionStart != null) {
        this.setSelectionRange(index, index);
      }
      next();
    });
  };
  $.fn.josh_caretPosition = function () {
    var el = this.get(0);
    if (el.createTextRange) {
      var range = el.createTextRange();
      range.moveStart('character', -el.value.length);
      return range.text.length;
    } else if (el.selectionStart != null) {
      return el.selectionStart;
    }
    return 0;
  };

  var history = Josh.History();
  var killring = new Josh.KillRing();

  Josh.Input = function (config) {
    config = config || {};

    // instance fields
    var _console = config.console || (Josh.Debug && root.console ? root.console : {
      log: function () {
      }
    });

    var _id = "#" + config.id;
    var _blinktime = config.blinktime || 500;
    var _active = false;
    var _cursor_visible = false;
    var _isInput = false;
    var _history = config.history || history;
    var _killring = config.killring || killring;
    var _text;
    var self = {
      templates: {
        span: _.template('<span class="input"><span class="left"/><span class="cursor"/><span class="right"/></span>')
      },
      history: _history,
      killring: _killring
    };

    $(document).ready(function () {
      var $input = $(_id);
      var el = $input.get(0);
      var readline = new Josh.ReadLine({
        history: _history,
        killring: _killring,
        console: _console
      });
      self.readline = readline;
      readline.attach(el);
      var activate = null;
      _isInput = $input.is('input');
      if (_isInput) {

        _console.log(_id + ' is an input');

        function renderInput(line) {
          var text = line ? line.text : '';
          _text = text;
          $input.val(text);
          $input.josh_caretTo(line.cursor);
        }
        readline.onChange(renderInput);
        $input.click(function() {
          var line = readline.getLine();
          line.cursor = $input.josh_caretPosition();
          readline.setLine(line);
        });

        activate = function() {
          // Note: have to re-render with a setTimeout, because on focus, but after the onfocus event is processed,
          // the input will select all, invalidating our render
          setTimeout(function() {
            renderInput(readline.getLine());
          }, 0);
        };
      } else {
        _console.log(_id + ' is a non-input element');
        $input.html(self.templates.span());
        if(typeof $input.attr('tabindex') === 'undefined') {
          $input.attr('tabindex',0);
        }
        var $left = $input.find('.left');
        var $right = $input.find('.right');
        var $cursor = $input.find('.cursor');

        function renderSpan(line) {
          var text = line.text || '';
          _text = text;
          var cursorIdx = line.cursor || 0;
          var left = _.escape(text.substr(0, cursorIdx)).replace(/ /g, '&nbsp;');
          var cursor = text.substr(cursorIdx, 1);
          var right = _.escape(text.substr(cursorIdx + 1)).replace(/ /g, '&nbsp;');
          $left.html(left);
          if (!cursor) {
            $cursor.html('&nbsp;').css('textDecoration', 'underline');
          } else {
            $cursor.text(cursor).css('textDecoration', 'underline');
          }
          $right.html(right);
        }

        function blinkCursor() {
          if (!_active) {
            return;
          }
          root.setTimeout(function () {
            if (!_active) {
              return;
            }
            _cursor_visible = !_cursor_visible;
            if (_cursor_visible) {
              $cursor.css('textDecoration', 'underline');
            } else {
              $cursor.css('textDecoration', '');
            }
            blinkCursor();
          }, _blinktime);
        }

        activate = function () {
          blinkCursor();
        }
        readline.onChange(renderSpan);
      }
      readline.unbind({keyCode: Josh.Keys.Special.Tab});
      readline.unbind({char: 'R', ctrlKey: true});
      readline.onActivate(function () {
        _active = true;
        activate();
      });
      readline.onDeactivate(function () {
        _active = false;
        if (_text) {
          _history.accept(_text);
        }
      });

    });
    return self;
  }
})(this, $, _);
