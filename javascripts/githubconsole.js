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

    // Enable console debugging, when Josh.Debug is set and there is a console object on the document root.
    var _console = (Josh.Debug && root.console) ? root.console : {
      log: function() {
      }
    };

    // Console State
    // --------------------------------------------
    //
    // `_self` contains all state variables for the console's operation
    var _self = {
      shell: Josh.Shell({console: _console}),
      api: "http://josh.claassen.net/github/"
    };

    // `Josh.PathHandler` is attached to `Josh.Shell` to provide basic file system navigation.
    _self.pathhandler = new Josh.PathHandler(_self.shell, {console: _console});

    // Custom Templates
    // ----------------
    // `Josh.Shell` uses *Underscore* templates for rendering output to the shell. This console overrides some and adds a couple of new ones for its own commands.

    // **templates.prompt**

    // Override of the default prompt to provide a multi-line prompt of the current user, repo and path and branch.
    _self.shell.templates.prompt = _.template("<em>[<%= self.user.login %>/<%= self.repo.name %>]</em></br>(<%=self.branch%>) <strong><%= node.path %> $</strong>");

    // **templates.ls**

    // Override of the pathhandler ls template to create a multi-column listing.
    _self.shell.templates.ls = _.template("<ul class='widelist'><% _.each(nodes, function(node) { %><li><%- node.name %></li><% }); %></ul><div class='clear'/>");

    // **templates.not_found**

    // Override of the pathhandler *not_found* template, since we will throw *not_found* if you try to access a valid file. This is done for the simplicity of the tutorial.
    _self.shell.templates.not_found = _.template("<div><%=cmd%>: <%=path%>: No such directory</div>");

    //**templates.rateLimitTemplate**

    // Since GitHub rate limits un-authenticated use rather drastically, we render the current rate limit status in the shell so that it is clear that extended experimenting requires authentication.
    _self.shell.templates.rateLimitTemplate = _.template("<%=remaining%>/<%=limit%><% if(!authenticated) {%> <a href='http://josh.claassen.net/github/authenticate'>Authenticate with Github to increase your Rate Limit.</a><%}%>");

    //**templates.user**

    // Render basic information (including gravatar) whenever we switch users or enter `user` without an argument
    _self.shell.templates.user = _.template("<div class='userinfo'>" +
      "<img src='<%=user.avatar_url%>' style='float:right;'/>" +
      "<table>" +
      "<tr><td><strong>Id:</strong></td><td><%=user.id %></td></tr>" +
      "<tr><td><strong>Name:</strong></td><td><%=user.login %></td></tr>" +
      "<tr><td><strong>Location:</strong></td><td><%=user.location %></td></tr>" +
      "</table>" +
      "</div>"
    );

    // **templates.user_error**
    // Generic error in case setting the user fails.
    _self.shell.templates.user_error = _.template("Unable to set user '<%=name%>': <%=msg%>");

    // **templates.repos**
    // Just like `ls`, we render a wide list of repositories for `repo -l`.
    _self.shell.templates.repos = _.template("<ul class='widelist'><% _.each(repos, function(repo) { %><li><%- repo.name %></li><% }); %></ul><div class='clear'/>");

    //
    // Whenever we change repositories or `repo` is called without an argument, we show basic information about the repo.
    _self.shell.templates.repo = _.template("<div><div><strong>Name: </strong><%=repo.full_name%></div><div><strong>Description: </strong><%=repo.description %></div></div>");

    // Error in case someone tries to switch to an invalid repo.
    _self.shell.templates.repo_not_found = _.template("<div>repo: <%=repo%>: No such repo for user '<%= user %>'</div>");

    // Generic error in case setting the repo fails.
    _self.shell.templates.repo_error = _.template("Unable to switch to repository '<%=name%>': <%=msg%>");

    // Again, like `ls`, we render a wide like of branches for `branch -l`.
    _self.shell.templates.branches = _.template("webfont.woff<ul class='widelist'><% _.each(branches, function(branch) { %><li><%- branch.name %></li><% }); %></ul><div class='clear'/>");

    // Generic error in case setting the current branch fails.
    _self.shell.templates.branch_error = _.template("Unable to switch to branch '<%=name%>': <%=msg%>");

    // Generic error in case fetching the list of branches fails.
    _self.shell.templates.branches_error = _.template("Unable to load branch list: <%=msg%>");

    // Adding Commands to the Console
    // ------------------------------

    //<section id='cmd.user'/>

    _self.shell.setCommandHandler("user", {
      exec: function(cmd, args, callback) {
        if(!args || args.length == 0) {
          return callback(_self.shell.templates.user({user: _self.user}));
        }
        var username = args[0];
        return setUser(username, null,
          function(msg) {
            return callback(_self.shell.templates.user_error({name: username, msg: msg}));
          },
          function(user) {
            return callback(_self.shell.templates.user({user: user}));
          }
        );
      }
    });

    //<section id='cmd.repo'/>

    _self.shell.setCommandHandler("repo", {
      exec: function(cmd, args, callback) {
        if(!args || args.length == 0) {
          return callback(_self.shell.templates.repo({repo: _self.repo}));
        }
        var name = args[0];
        if(name === '-l') {
          return callback(_self.shell.templates.repos({repos: _self.repos}));
        }
        var repo = getRepo(name, _self.repos);
        if(!repo) {
          return callback(_self.shell.templates.repo_error({name: name, msg: 'no such repo'}));
        }
        return setRepo(repo,
          function(msg) {
            return callback(_self.shell.templates.repo_error({name: name, msg: msg}));
          },
          function(repo) {
            if(!repo) {
              return callback(_self.shell.templates.repo_not_found({repo: name, user: _self.user.login}));
            }
            return callback(_self.shell.templates.repo({repo: _self.repo}));
          }
        );
      },
      completion: function(cmd, arg, line, callback) {
        callback(_self.shell.bestMatch(arg, _.map(_self.repos, function(repo) {
          return repo.name;
        })));
      }
    });

    //<section id='cmd.branch'/>

    _self.shell.setCommandHandler("branch", {
      exec: function(cmd, args, callback) {
        if(!args || args.length == 0) {
          return callback(_self.branch);
        }
        var branch = args[0];
        if(branch === '-l') {
          return ensureBranches(
            function(msg) {
              callback(_self.shell.templates.branches_error({msg: msg}));
            },
            function() {
              return callback(_self.shell.templates.branches({branches: _self.branches}));
            }
          );
        }
        return getDir(_self.repo.full_name, branch, "/", function(node) {
          if(!node) {
            callback(_self.shell.templates.branch_error({name: branch, msg: "unable to load root directory for branch"}));
          }
          _self.branch = branch;
          _self.pathhandler.current = node;
          callback();
        });
      },
      completion: function(cmd, arg, line, callback) {
        return ensureBranches(
          function() {
            callback();
          },
          function() {
            callback(_self.shell.bestMatch(arg, _.map(_self.branches, function(branch) {
              return branch.name;
            })));
          }
        );
      }
    });

    //<section id='onNewPrompt'/>

    // prompt configuration
    _self.shell.onNewPrompt(function(callback) {
      callback(_self.shell.templates.prompt({self: _self, node: _self.pathhandler.current}));
    });


    //<section id='getNode'/>

    // wiring up pathhandler for navigating repository file system
    _self.pathhandler.getNode = function(path, callback) {
      _console.log("looking for node at: " + path);
      if(!path) {
        return callback(_self.pathhandler.current);
      }
      var parts = _.filter(path.split("/"), function(x) {
        return x;
      });
      _console.log(parts);
      if(parts[0] === "..") {
        _console.log("looking for parent relative");
        var parentParts = _.filter(_self.pathhandler.current.path.split("/"), function(x) {
          return x;
        });
        if(parentParts.length == 0) {
          return callback(_self.pathhandler.current);
        }
        path = "/" + parentParts.slice(0, parentParts.length - 1).join('/') + "/" + parts.slice(1).join("/");
      } else if(path[0] !== '/') {
        _console.log("looking for current relative");
        if(_self.pathhandler.current.path === '/') {
          path = '/' + path;
        } else {
          path = _self.pathhandler.current.path + "/" + path;
        }
      }
      _console.log("path to fetch: " + path);
      return getDir(_self.repo.full_name, _self.branch, path, callback);
    };

    //<section id='getChildNodes'/>

    _self.pathhandler.getChildNodes = function(node, callback) {
      if(node.isfile) {
        _console.log("it's a file, no children");
        return callback();
      }
      if(node.children) {
        _console.log("got children, let's turn them into nodes");
        return callback(makeNodes(node.children));
      }
      _console.log("no children, fetch them");
      return getDir(_self.repo.full_name, _self.branch, node.path, function(detailNode) {
        node.children = detailNode.children;
        callback(makeNodes(node.children));
      });
    };

    // Supporting Functions
    // --------------------

    //<section id='get'/>

    function get(resource, args, callback) {
      var url = _self.api + resource;
      if(args) {
        url += "?" + _.map(args,function(v, k) {
          return k + "=" + v;
        }).join("&");
      }
      _console.log("fetching: " + url);
      var request = {
        url: url,
        dataType: 'json',
        xhrFields: {
          withCredentials: true
        }
      };
      $.ajax(request).done(function(response,status,xhr) {
        var ratelimit = {
          remaining: parseInt(xhr.getResponseHeader("X-RateLimit-Remaining")),
          limit: parseInt(xhr.getResponseHeader("X-RateLimit-Limit")),
          authenticated: xhr.getResponseHeader('Authenticated') === 'true'
        };
        $('#ratelimit').html(_self.shell.templates.rateLimitTemplate(ratelimit));
        if(ratelimit.remaining == 0) {
          alert("Whoops, you've hit the github rate limit. You'll need to authenticate to continue");
          _self.shell.deactivate();
          return null;
        }
        if(status !== 'success') {
          return callback();
        }
        return callback(response);
      })
    }

    //<section id='ensureBranches'/>

    function ensureBranches(err, callback) {
      get("repos/" + _self.repo.full_name + "/branches", null, function(branches) {
        if(!branches) {
          return err("api request failed to return branch list");
        }
        _self.branches = branches;
        return callback();
      });
    }

    //<section id='setUser'/>

    function setUser(user_name, repo_name, err, callback) {
      if(_self.user && _self.user.login === user_name) {
        return callback(_self.user);
      }
      return get("users/" + user_name, null, function(user) {
        if(!user) {
          return err("no such user");
        }
        return initializeRepos(user, repo_name, err, function(repo) {
          _self.user = user;
          return callback(_self.user);
        });
      });
    }

    //<section id='initializeRepos'/>

    function initializeRepos(user, repo_name, err, callback) {
      return getRepos(user.login, function(repos) {
        var repo = getRepo(repo_name, repos);
        if(!repo) {
          return err("user has no repositories");
        }
        return setRepo(repo, err, function(repo) {
          _self.repos = repos;
          return callback(repo);
        });
      });
    }

    //<section id='getDir'/>

    function getDir(repo_full_name, branch, path, callback) {
      if(path && path.length > 1 && path[path.length - 1] === '/') {
        path = path.substr(0, path.length - 1);
      }
      get("repos/" + repo_full_name + "/contents" + path, {ref: branch}, function(data) {
        if(Object.prototype.toString.call(data) !== '[object Array]') {
          _console.log("path '" + path + "' was a file");
          return callback();
        }
        var node = {
          name: _.last(_.filter(path.split("/"), function(x) {
            return x;
          })) || "",
          path: path,
          children: data
        };
        _console.log("got node at: " + node.path);
        return callback(node);
      });
    }

    //<section id='getRepos'/>

    function getRepos(userLogin, callback) {
      return get("users/" + userLogin + "/repos", null, function(data) {
        callback(data);
      });
    }

    //<section id='getRepo'/>

    function getRepo(repo_name, repos) {
      if(!repos || repos.length == 0) {
        return null;
      }
      var repo;
      if(repo_name) {
        repo = _.find(repos, function(repo) {
          return repo.name === repo_name;
        });
        if(!repo) {
          return callback();
        }
      } else {
        repo = repos[0];
      }
      return repo;
    }

    //<section id='setRepo'/>

    function setRepo(repo, err, callback) {
      return getDir(repo.full_name, repo.default_branch, "/", function(node) {
        if(!node) {
          return err("could not initialize root directory of repository '" + repo.full_name + "'");
        }
        _console.log("setting repo to '" + repo.name + "'");
        _self.repo = repo;
        _self.branch = repo.default_branch;
        _self.pathhandler.current = node;
        return callback(repo);
      });
    }

    //<section id='makeNodes'/>

    function makeNodes(children) {
      return _.map(children, function(node) {
        return {
          name: node.name,
          path: "/" + node.path,
          isFile: node.type === 'file'
        };
      });
    }

    //<section id='initializationError'/>

    function initializationError(context, msg) {
      _console.log("[" + context + "] failed to initialize: " + msg);
      alert("unable to initialize shell. Encountered a problem talking to github api. Try reloading the page");
    }

    //<section id='initializeUI'/>

    function initializeUI() {
      _console.log("activating");
      var $consolePanel = $('#shell-container');
      $consolePanel.resizable({ handles: "s"});
      $(document).keypress(function(event) {
        if(_self.shell.isActive()) {
          return;
        }
        if(event.keyCode == 126) {
          event.preventDefault();
          activateAndShow();
        }
      });
      function activateAndShow() {
        _self.shell.activate();
        $consolePanel.slideDown();
        $consolePanel.focus();
      }

      function hideAndDeactivate() {
        _self.shell.deactivate();
        $consolePanel.slideUp();
        $consolePanel.blur();
      }

      _self.shell.onEOT(hideAndDeactivate);
      _self.shell.onCancel(hideAndDeactivate);
    }

    //<section id='document.ready'/>

    $(document).ready(function() {
      setUser("sdether", "josh.js",
        function(msg) {
          initializationError("default", msg);
        },
        initializeUI
      );
    });
  })(root, $, _);
})(this, $, _);