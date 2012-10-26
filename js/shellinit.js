shell = new MtShell({history: new ReadLine.History({storage: localStorage})});
(function($) {
  $(document).ready(function() {
    var mtConsole = $('#shell-panel');

    function showConsole() {
      mtConsole.slideDown();
      mtConsole.focus();
    }

    function hideConsole() {
      console.log("slideup");
      mtConsole.slideUp(1000, function() {
        console.log("blur");
        mtConsole.blur();
      });
    }

    mtConsole.focus(function() {
      shell.activate();
      if(localStorage) {
        localStorage.setItem('mtShell.visible', true);
      }
    });
    mtConsole.blur(function() {
      console.log("deactivating");
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
        console.log("hiding console");
        hideConsole();
      }
    });
  });
})($);