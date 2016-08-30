(function(exports) {
'use strict';

var ie = false;

/*
  normalizeName() is inspired by Ember's loader:
  https://github.com/emberjs/ember.js/blob/0591740685ee2c444f2cfdbcebad0bebd89d1303/packages/loader/lib/main.js#L39-L53
 */
function normalizeName(child, parentBase) {
    if (child.charAt(0) === '/') {
        child = child.slice(1);
    }
    if (child.charAt(0) !== '.') {
        return child;
    }
    var parts = child.split('/');
    while (parts[0] === '.' || parts[0] === '..') {
        if (parts.shift() === '..') {
            parentBase.pop();
        }
    }
    return parentBase.concat(parts).join('/');
}

var seen = Object.create(null);
var internalRegistry = Object.create(null);
var externalRegistry = Object.create(null);
var anonymousEntry;

function ensuredExecute(name) {
    var mod = internalRegistry[name];
    if (mod && !seen[name]) {
        seen[name] = true;
        // one time operation to execute the module body
        mod.execute();
    }
    return mod && mod.proxy;
}

function set(name, values) {
    externalRegistry[name] = values;
}

function get(name) {
    return externalRegistry[name] || ensuredExecute(name);
}

function has(name) {
    return !!externalRegistry[name] || !!internalRegistry[name];
}

function createScriptNode(src, callback) {
  try {
    loadSubScript(src);
    callback();
  } catch(err) {
    callback(err);
  }
}

function load(name) {
    return new Promise(function(resolve, reject) {
        createScriptNode((System.baseURL || '/') + name + '.js', function(err) {
            if (anonymousEntry) {
                System.register(name, anonymousEntry[0], anonymousEntry[1]);
                anonymousEntry = undefined;
            }
            var mod = internalRegistry[name];
            if (!mod) {
                reject(new Error('Error loading module ' + name));
                return;
            }
            Promise.all(mod.deps.map(function (dep) {
                if (externalRegistry[dep] || internalRegistry[dep]) {
                    return Promise.resolve();
                }
                return load(dep);
            })).then(resolve, reject);
        });
    });
}


var System = {
    set: set,
    get: get,
    has: has,
    import: function(name) {
        return new Promise(function(resolve, reject) {
            var normalizedName = normalizeName(name, []);
            var mod = get(normalizedName);
            return mod ? resolve(mod) : load(name).then(function () {
                resolve(get(normalizedName));
            }).catch(reject);
        });
    },
    register: function(name, deps, wrapper) {
        if (Array.isArray(name)) {
            // anounymous module
            anonymousEntry = [];
            anonymousEntry.push.apply(anonymousEntry, arguments);
            return; // breaking to let the script tag to name it.
        }
        var proxy = Object.create(null),
            values = Object.create(null),
            mod, meta;
        // creating a new entry in the internal registry
        internalRegistry[name] = mod = {
            // live bindings
            proxy: proxy,
            // exported values
            values: values,
            // normalized deps
            deps: deps.map(function(dep) {
                return normalizeName(dep, name.split('/').slice(0, -1));
            }),
            // other modules that depends on this so we can push updates into those modules
            dependants: [],
            // method used to push updates of deps into the module body
            update: function(moduleName, moduleObj) {
                meta.setters[mod.deps.indexOf(moduleName)](moduleObj);
            },
            execute: function() {
                mod.deps.map(function(dep) {
                    var imports = externalRegistry[dep];
                    if (imports) {
                        mod.update(dep, imports);
                    } else {
                        imports = get(dep) && internalRegistry[dep].values; // optimization to pass plain values instead of bindings
                        if (imports) {
                            internalRegistry[dep].dependants.push(name);
                            mod.update(dep, imports);
                        }
                    }
                });
                meta.execute();
            }
        };
        // collecting execute() and setters[]
        meta = wrapper(function(identifier, value) {
            values[identifier] = value;
            mod.lock = true; // locking down the updates on the module to avoid infinite loop
            mod.dependants.forEach(function(moduleName) {
                if (internalRegistry[moduleName] && !internalRegistry[moduleName].lock) {
                    internalRegistry[moduleName].update(name, values);
                }
            });
            mod.lock = false;
            if (!Object.getOwnPropertyDescriptor(proxy, identifier)) {
                Object.defineProperty(proxy, identifier, {
                    enumerable: true,
                    get: function() {
                        return values[identifier];
                    }
                });
            }
            return value;
        });
    }
};

// exporting the System object
exports.System = System;

})(exports);
