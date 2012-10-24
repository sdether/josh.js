(function($, document, window) {
  MtShell = function(config) {
    var _shell = new Shell();

    // public methods
    var self = {
      activate: function() {
        _shell.activate();
      },
      deactivate: function() {
        _shell.deactivate();
      }
    };

    // private methods
    function completionHandler(line, callback) {
      callback();
    }

    function cmdHandler(cmd, input_id, callback) {
      callback();
    }

    _shell.onCompletion(completionHandler);
    _shell.onCmd(cmdHandler);

    return self;
  };
})();
