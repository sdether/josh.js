shell = new MtShell({history: new ReadLine.History({storage: localStorage})});
(function($) {
  $(document).ready(function() {
    var mtConsole = $('#shell');

    function showConsole() {
      mtConsole.slideDown();
      mtConsole.focus();
    }

    function hideConsole() {
      mtConsole.slideUp();
      mtConsole.blur();
    }

    mtConsole.focus(function() {
      shell.activate();
      if(localStorage) {
        localStorage.setItem('mtShell.visible', true);
      }
    });
    mtConsole.blur(function() {
      shell.deactivate();
      if(localStorage) {
        localStorage.setItem('mtShell.visible', false);
      }
    });
    function initShell() {

    }

    if(localStorage) {
      var item = localStorage.getItem("mtShell.visible");
      var visible = item ? JSON.parse(item) : false;
      if(visible) {
        showConsole();
      }
    }
    $(document).on('keyup', function(e) {
      if(e.keyCode && e.keyCode === 192 && e.shiftKey) {
        showConsole();
      } else if(e.keyCode && e.keyCode === 27) {
        hideConsole();
      }
    });
  });
})($);