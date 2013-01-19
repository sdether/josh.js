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
(function (root) {
  Josh.KillRing = function (config) {
    config = config || {};

    var _console = Josh.Debug && root.console ? root.console : {log:function () {
    }};
    var _ring = config.ring || [];
    var _cursor = config.cursor || 0;
    var _current = '';
    var _yanking = false;
    if (_ring.length == 0) {
      _cursor = -1;
    } else if (_cursor >= _ring.length) {
      _cursor = _ring.length - 1;
    }
    var self = {
      append:function (value) {
        _yanking = false;
        if (!value) {
          return;
        }
        _current += value;
      },
      prepend:function (value) {
        _yanking = false;
        if (!value) {
          return;
        }
        _current = value + _current;
      },
      commit:function () {
        _yanking = false;
        if (!_current) {
          return;
        }
        _ring.push(_current);
        _cursor = _ring.length - 1;
        _current = '';
      },
      yank:function () {
        self.commit();
        if (_ring.length == 0) {
          return;
        }
        _yanking = true;
        return _ring[_cursor];
      },
      rotate:function () {
        if (!_yanking || _ring.length == 0) {
          return;
        }
        --_cursor;
        if (_cursor < 0) {
          _cursor = _ring.length - 1;
        }
        return self.yank();
      }
    };
    return self;
  }
})(this);