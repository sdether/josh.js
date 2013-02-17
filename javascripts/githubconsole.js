/*------------------------------------------------------------------------*
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
(function(root, $, _) {
  Josh.GitHubConsole = (function(root, $, _) {
    var _console = (Josh.Debug && root.console) ? root.console : {
      log: function() {
      }
    };
    var _shell = Josh.Shell({console: _console});
    var _pathhandler = new Josh.PathHandler(_shell, {console: _console});
    var _self = {
      api: "https://api.github.com/",
    };
    _shell.templates.repos = _.template("<ul class='widelist'><% _.each(repos, function(repo) { %><li><%- repo.name %></li><% }); %></ul>");
    _shell.templates.prompt = _.template("<em>[<%= self.user.login %>/<%= self.repo.name %>]</em></br>(<%=self.branch%>) <strong><%= node.path %> $</strong>");
    _shell.templates.input_cmd = _.template('<div id="<%- id %>"><span class="prompt"></span>&nbsp;<span class="input"><span class="left"/><span class="cursor"/><span class="right"/></span></div>');
    _shell.templates.repo_not_found = _.template("<div>repo: <%=repo%>: No such repo for user '<%= user %>'</div>");
    _shell.templates.repo = _.template("<div><div><strong>Name: </strong><%=repo.full_name%></div><div><strong>Description: </strong><%=repo.description %></div></div>");
    _shell.templates.ls = _.template("<ul class='widelist'><% _.each(nodes, function(node) { %><li><%- node.name %></li><% }); %></ul>");


    _shell.setCommandHandler("repos", {
      exec: function(cmd, args, callback) {
        callback(_shell.templates.repos({repos: _self.repos}));
      }
    });
    _shell.setCommandHandler("repo", {
      exec: function(cmd, args, callback) {
        if(!args || args.length == 0) {
          return callback(_shell.templates.repo({repo: _self.repo}));
        }
        var name = args[0];
        return setRepo(args[0], function(repo) {
          if(!repo) {
            return callback(_shell.templates.repo_not_found({repo: name, user: _self.user.login}));
          }
          return callback(_shell.templates.repo({repo: _self.repo}));
        });
      },
      completion: function(cmd, arg, line, callback) {
        callback(_shell.bestMatch(arg, _.map(_self.repos, function(repo) {
          return repo.name;
        })));
      }
    });

    function getRepos(callback) {
      var uri = _self.api + "users/" + _self.user.login + "/repos?callback=?";
      _console.log("fetching: " + uri);
      return $.getJSON(uri, function(response) {
        checkRateLimit(response.meta);
        _self.repos = response.data;
        callback();
      });
    }

    function setUser(user, repo, callback) {
      if(_self.user && _self.user.login === user) {
        return callback();
      }
      var uri = _self.api + "users/" + user + "?callback=?";
      _console.log("fetching: " + uri);
      return $.getJSON(uri, function(response) {
        checkRateLimit(response.meta);
        _self.user = response.data;
        getRepos(function() {
          setRepo(repo, function() {
            callback();
          });
        });
      });
    }

    function checkRateLimit(meta) {
      _console.log(response.meta);
      if(response.meta["X-RateLimit-Remaining"] == 0) {
        alert("Whoops, you've hit the github rate limit. You'll need to authenticate to continue");
      }
      _shell.deactivate();
    }

    function getDir(path, callback) {
      if(path && path.length > 1 && path[path.length-1] === '/') {
        path = path.substr(0,path.length-1);
      }
      var uri = _self.api + "repos/" + _self.user.login + "/" + _self.repo.name + "/contents" + path + "?callback=?";
      //var uri = _self.api + "repos/" + _self.user.login + "/" + _self.repo.name + "/contents" + path + "?ref=" + _self.branch + "&callback=?";
      _console.log("fetching: " + uri);
      $.getJSON(uri, function(response) {
        checkRateLimit(response.meta);
        if(Object.prototype.toString.call(response.data) !== '[object Array]') {
          _console.log("path '" + path + "' was a file");
          return callback();
        }
        var node = {
          name: _.last(_.filter(path.split("/"), function(x) {
            return x;
          })) || "",
          path: path,
          children: response.data
        };
        _console.log("got node at: " + node.path);
        return callback(node);
      });
    }

    function setRepo(repoName, callback) {
      _console.log("setting repo to '" + repoName + "'");
      var repo;
      if(repoName) {
        repo = _.find(_self.repos, function(repo) {
          return repo.name === repoName;
        });
        if(!repo) {
          return callback();
        }
      } else {
        repo = _self.repos[0];
      }
      _self.repo = repo;
      _self.branch = repo.default_branch || "master";
      return getDir("/", function(node) {
        _console.log("initializing pathhandler node");
        _pathhandler.current = node;
        callback(repo);
      });
    }

    function makeNodes(children) {
      return _.map(children, function(node) {
        return {
          name: node.name,
          path: "/" + node.path,
          isFile: node.type === 'file'
        };
      });
    }

    _shell.onNewPrompt(function(callback) {
      callback(_shell.templates.prompt({self: _self, node: _pathhandler.current}));
    });

    _pathhandler.getNode = function(path, callback) {
      _console.log("looking for node at: " + path);
      if(!path) {
        return callback(_pathhandler.current);
      }
      var parts = _.filter(path.split("/"), function(x) {
        return x;
      });
      _console.log(parts);
      if(parts[0] === "..") {
        _console.log("looking for parent relative");
        var parentParts = _.filter(_pathhandler.current.path.split("/"), function(x) {
          return x;
        });
        if(parentParts.length == 0) {
          return callback(_pathhandler.current);
        }
        path = "/" + parentParts.slice(0, parentParts.length - 1).join('/') + "/" + parts.slice(1).join("/");
      } else if(path[0] !== '/') {
        _console.log("looking for current relative");
        if(_pathhandler.current.path === '/') {
          path = '/' + path;
        } else {
          path = _pathhandler.current.path + "/" + path;
        }
      }
      _console.log("path to fetch: " + path);
      return getDir(path, callback);
    };
    _pathhandler.getChildNodes = function(node, callback) {
      if(node.isfile) {
        _console.log("it's a file, no children");
        return callback();
      }
      if(node.children) {
        _console.log("got children, let's turn them into nodes");
        return callback(makeNodes(node.children));
      }
      _console.log("no children, fetch them");
      return getDir(node.path, function(detailNode) {
        node.children = detailNode.children;
        callback(makeNodes(node.children));
      });
    };


    $(document).ready(function() {
      var $consolePanel = $('#shell-panel');
      $consolePanel.resizable({ handles: "s"});
      _console.log("initializing 'sdether'");
      setUser("sdether", "josh.js", function() {
        _console.log("activating");
        _shell.activate();
      });
    });
  })(root, $, _);
})(this, $, _);