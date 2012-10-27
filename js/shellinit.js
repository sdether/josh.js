shell = new MtShell({history: new ReadLine.History({storage: localStorage})});
(function($) {
  $(document).ready(function() {
    var mtConsole = $('#shell-panel');

    function showConsole() {
      mtConsole.slideDown();
      mtConsole.focus();
      shell.activate();
      if(localStorage) {
        localStorage.setItem('mtShell.visible', true);
      }
    }

    function hideConsole() {
      console.log("hiding");
      if(localStorage) {
        localStorage.setItem('mtShell.visible', false);
        console.log("done storing state");
      }
      mtConsole.blur();
      console.log("blurred");
      mtConsole.slideUp(1000, function() {
        console.log("done hiding");
      });
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
      }
    });
    shell.onDeactivate(hideConsole);
  });
})($);