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
    Josh.QuakeConsole = (function(root, $, _) {
        var treeroot = buildTree();
        var shell = Josh.Shell();
        var pathhandler = new Josh.PathHandler(shell);
        pathhandler.current = treeroot;
        pathhandler.getNode = function(path, callback) {
            if(!path) {
                return callback(pathhandler.current);
            }
            var parts = _.filter(path.split('/'), function(x) {
                return x;
            });
            var start = ((path || '')[0] == '/') ? treeroot : pathhandler.current;
            return findNode(start, parts, callback);
        };
        pathhandler.getChildNodes = function(node, callback) {
            callback(node.childnodes);
        };
        function findNode(current, parts, callback) {
            if(!parts || parts.length == 0) {
                return callback(current);
            }
            if(parts[0] == ".") {

            } else if(parts[0] == "..") {
                current = current.parent;
            } else {
                current = _.first(_.filter(current.childnodes, function(node) {
                    return node.name == parts[0];
                }));
            }
            if(!current) {
                return callback();
            }
            return findNode(current, _.rest(parts), callback);
        }
        $(document).ready(function() {
            var $consolePanel = $('#shell-panel');
            $consolePanel.resizable({ handles: "s"});
            $(document).keypress(function(event) {
                if(shell.isActive()) {
                    return;
                }
                if(event.keyCode == 126) {
                    event.preventDefault();
                    shell.activate();
                    $consolePanel.slideDown();
                    $consolePanel.focus();
                }
            });
            function hideAndDeactivate() {
                shell.deactivate();
                $consolePanel.slideUp();
                $consolePanel.blur();
            }
            shell.onEOT(hideAndDeactivate);
            shell.onCancel(hideAndDeactivate);
        });
        function buildTree() {
            var fs = {
                bin: {},
                boot: {},
                dev: {},
                etc: {
                    default: {},
                    'rc.d': {},
                    sysconfig: {},
                    x11: {}
                },
                home: {
                    bob: {
                        video: {
                            'firefly.m4v': {}
                        },
                        videos: {
                            'Arrested Development': {
                                's1e1.m4v': {}
                            },
                            'Better Off Ted': {
                                's1e1.m4v': {}
                            }
                        }
                    },
                    jane: {}
                },
                lib: {},
                'lost+found': {},
                misc: {},
                mnt: {
                    cdrom: {},
                    sysimage: {}
                },
                net: {},
                opt: {},
                proc: {},
                root: {},
                sbin: {},
                usr: {
                    x11: {},
                    bin: {},
                    include: {},
                    lib: {},
                    local: {},
                    man: {},
                    sbin: {},
                    share: {
                        doc: {}
                    },
                    src: {}
                },
                var: {
                    lib: {},
                    lock: {},
                    run: {},
                    log: {
                        httpd: {
                            access_log: {},
                            error_log: {}
                        },
                        'boot.log': {},
                        cron: {},
                        messages: {}
                    }
                }
            };

            function build(parent, node) {
                parent.childnodes = _.map(_.pairs(node), function(pair) {
                    var child = {
                        name: pair[0],
                        path: parent.path + "/" + pair[0],
                        parent: parent
                    };
                    build(child, pair[1]);
                    return child;
                });
                parent.children = _.keys(node);
                return parent;
            }
            var tree = build({name: "", path: ""}, fs);
            tree.path = '/';
            return tree;
        }
    })(root, $, _);
})(this, $, _);