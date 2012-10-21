Shell = function(config) {
  $ = config.jquery;
  _config = config;
  _config.prompt = _config.prompt || "jsh$";
  _readline = config.readline;
  _line = null;
  _readline.onChange(function(line) {
    _line = line;
    Render();
  });

  function Render() {

  }
  var self = {
    setPrompt: function(prompt) {
      $(config.prompt_id).text(prompt);
    }
  };
  self.setPrompt(_config.prompt);
  return self;
}
