var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var res = mod._cached ? mod._cached : mod();
    return res;
}

require.paths = [];
require.modules = {};
require.extensions = [".js",".coffee"];

require._core = {
    'assert': true,
    'events': true,
    'fs': true,
    'path': true,
    'vm': true
};

require.resolve = (function () {
    return function (x, cwd) {
        if (!cwd) cwd = '/';
        
        if (require._core[x]) return x;
        var path = require.modules.path();
        cwd = path.resolve('/', cwd);
        var y = cwd || '/';
        
        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }
        
        var n = loadNodeModulesSync(x, y);
        if (n) return n;
        
        throw new Error("Cannot find module '" + x + "'");
        
        function loadAsFileSync (x) {
            if (require.modules[x]) {
                return x;
            }
            
            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }
        
        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = x + '/package.json';
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }
            
            return loadAsFileSync(x + '/index');
        }
        
        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }
            
            var m = loadAsFileSync(x);
            if (m) return m;
        }
        
        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');
            
            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }
            
            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);
    
    var keys = (Object.keys || function (obj) {
        var res = [];
        for (var key in obj) res.push(key)
        return res;
    })(require.modules);
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

require.define = function (filename, fn) {
    var dirname = require._core[filename]
        ? ''
        : require.modules.path().dirname(filename)
    ;
    
    var require_ = function (file) {
        return require(file, dirname)
    };
    require_.resolve = function (name) {
        return require.resolve(name, dirname);
    };
    require_.modules = require.modules;
    require_.define = require.define;
    var module_ = { exports : {} };
    
    require.modules[filename] = function () {
        require.modules[filename]._cached = module_.exports;
        fn.call(
            module_.exports,
            require_,
            module_,
            module_.exports,
            dirname,
            filename
        );
        require.modules[filename]._cached = module_.exports;
        return module_.exports;
    };
};

if (typeof process === 'undefined') process = {};

if (!process.nextTick) process.nextTick = (function () {
    var queue = [];
    var canPost = typeof window !== 'undefined'
        && window.postMessage && window.addEventListener
    ;
    
    if (canPost) {
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'browserify-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);
    }
    
    return function (fn) {
        if (canPost) {
            queue.push(fn);
            window.postMessage('browserify-tick', '*');
        }
        else setTimeout(fn, 0);
    };
})();

if (!process.title) process.title = 'browser';

if (!process.binding) process.binding = function (name) {
    if (name === 'evals') return require('vm')
    else throw new Error('No such module')
};

if (!process.cwd) process.cwd = function () { return '.' };

if (!process.env) process.env = {};
if (!process.argv) process.argv = [];

require.define("path", function (require, module, exports, __dirname, __filename) {
function filter (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (fn(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
var resolvedPath = '',
    resolvedAbsolute = false;

for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
  var path = (i >= 0)
      ? arguments[i]
      : process.cwd();

  // Skip empty and invalid entries
  if (typeof path !== 'string' || !path) {
    continue;
  }

  resolvedPath = path + '/' + resolvedPath;
  resolvedAbsolute = path.charAt(0) === '/';
}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
var isAbsolute = path.charAt(0) === '/',
    trailingSlash = path.slice(-1) === '/';

// Normalize the path
path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }
  
  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};


exports.dirname = function(path) {
  var dir = splitPathRe.exec(path)[1] || '';
  var isWindows = false;
  if (!dir) {
    // No dirname
    return '.';
  } else if (dir.length === 1 ||
      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
    // It is just a slash or a drive letter with a slash
    return dir;
  } else {
    // It is a full dirname, strip trailing slash
    return dir.substring(0, dir.length - 1);
  }
};


exports.basename = function(path, ext) {
  var f = splitPathRe.exec(path)[2] || '';
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPathRe.exec(path)[3] || '';
};

});

require.define("util", function (require, module, exports, __dirname, __filename) {
var events = require('events');

exports.print = function () {};
exports.puts = function () {};
exports.debug = function() {};

exports.inspect = function(obj, showHidden, depth, colors) {
  var seen = [];

  var stylize = function(str, styleType) {
    // http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
    var styles =
        { 'bold' : [1, 22],
          'italic' : [3, 23],
          'underline' : [4, 24],
          'inverse' : [7, 27],
          'white' : [37, 39],
          'grey' : [90, 39],
          'black' : [30, 39],
          'blue' : [34, 39],
          'cyan' : [36, 39],
          'green' : [32, 39],
          'magenta' : [35, 39],
          'red' : [31, 39],
          'yellow' : [33, 39] };

    var style =
        { 'special': 'cyan',
          'number': 'blue',
          'boolean': 'yellow',
          'undefined': 'grey',
          'null': 'bold',
          'string': 'green',
          'date': 'magenta',
          // "name": intentionally not styling
          'regexp': 'red' }[styleType];

    if (style) {
      return '\033[' + styles[style][0] + 'm' + str +
             '\033[' + styles[style][1] + 'm';
    } else {
      return str;
    }
  };
  if (! colors) {
    stylize = function(str, styleType) { return str; };
  }

  function format(value, recurseTimes) {
    // Provide a hook for user-specified inspect functions.
    // Check that value is an object with an inspect function on it
    if (value && typeof value.inspect === 'function' &&
        // Filter out the util module, it's inspect function is special
        value !== exports &&
        // Also filter out any prototype objects using the circular check.
        !(value.constructor && value.constructor.prototype === value)) {
      return value.inspect(recurseTimes);
    }

    // Primitive types cannot have properties
    switch (typeof value) {
      case 'undefined':
        return stylize('undefined', 'undefined');

      case 'string':
        var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                                 .replace(/'/g, "\\'")
                                                 .replace(/\\"/g, '"') + '\'';
        return stylize(simple, 'string');

      case 'number':
        return stylize('' + value, 'number');

      case 'boolean':
        return stylize('' + value, 'boolean');
    }
    // For some reason typeof null is "object", so special case here.
    if (value === null) {
      return stylize('null', 'null');
    }

    // Look up the keys of the object.
    var visible_keys = Object_keys(value);
    var keys = showHidden ? Object_getOwnPropertyNames(value) : visible_keys;

    // Functions without properties can be shortcutted.
    if (typeof value === 'function' && keys.length === 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        var name = value.name ? ': ' + value.name : '';
        return stylize('[Function' + name + ']', 'special');
      }
    }

    // Dates without properties can be shortcutted
    if (isDate(value) && keys.length === 0) {
      return stylize(value.toUTCString(), 'date');
    }

    var base, type, braces;
    // Determine the object type
    if (isArray(value)) {
      type = 'Array';
      braces = ['[', ']'];
    } else {
      type = 'Object';
      braces = ['{', '}'];
    }

    // Make functions say that they are functions
    if (typeof value === 'function') {
      var n = value.name ? ': ' + value.name : '';
      base = (isRegExp(value)) ? ' ' + value : ' [Function' + n + ']';
    } else {
      base = '';
    }

    // Make dates with properties first say the date
    if (isDate(value)) {
      base = ' ' + value.toUTCString();
    }

    if (keys.length === 0) {
      return braces[0] + base + braces[1];
    }

    if (recurseTimes < 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        return stylize('[Object]', 'special');
      }
    }

    seen.push(value);

    var output = keys.map(function(key) {
      var name, str;
      if (value.__lookupGetter__) {
        if (value.__lookupGetter__(key)) {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Getter/Setter]', 'special');
          } else {
            str = stylize('[Getter]', 'special');
          }
        } else {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Setter]', 'special');
          }
        }
      }
      if (visible_keys.indexOf(key) < 0) {
        name = '[' + key + ']';
      }
      if (!str) {
        if (seen.indexOf(value[key]) < 0) {
          if (recurseTimes === null) {
            str = format(value[key]);
          } else {
            str = format(value[key], recurseTimes - 1);
          }
          if (str.indexOf('\n') > -1) {
            if (isArray(value)) {
              str = str.split('\n').map(function(line) {
                return '  ' + line;
              }).join('\n').substr(2);
            } else {
              str = '\n' + str.split('\n').map(function(line) {
                return '   ' + line;
              }).join('\n');
            }
          }
        } else {
          str = stylize('[Circular]', 'special');
        }
      }
      if (typeof name === 'undefined') {
        if (type === 'Array' && key.match(/^\d+$/)) {
          return str;
        }
        name = JSON.stringify('' + key);
        if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
          name = name.substr(1, name.length - 2);
          name = stylize(name, 'name');
        } else {
          name = name.replace(/'/g, "\\'")
                     .replace(/\\"/g, '"')
                     .replace(/(^"|"$)/g, "'");
          name = stylize(name, 'string');
        }
      }

      return name + ': ' + str;
    });

    seen.pop();

    var numLinesEst = 0;
    var length = output.reduce(function(prev, cur) {
      numLinesEst++;
      if (cur.indexOf('\n') >= 0) numLinesEst++;
      return prev + cur.length + 1;
    }, 0);

    if (length > 50) {
      output = braces[0] +
               (base === '' ? '' : base + '\n ') +
               ' ' +
               output.join(',\n  ') +
               ' ' +
               braces[1];

    } else {
      output = braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
    }

    return output;
  }
  return format(obj, (typeof depth === 'undefined' ? 2 : depth));
};


function isArray(ar) {
  return ar instanceof Array ||
         Array.isArray(ar) ||
         (ar && ar !== Object.prototype && isArray(ar.__proto__));
}


function isRegExp(re) {
  return re instanceof RegExp ||
    (typeof re === 'object' && Object.prototype.toString.call(re) === '[object RegExp]');
}


function isDate(d) {
  if (d instanceof Date) return true;
  if (typeof d !== 'object') return false;
  var properties = Date.prototype && Object_getOwnPropertyNames(Date.prototype);
  var proto = d.__proto__ && Object_getOwnPropertyNames(d.__proto__);
  return JSON.stringify(proto) === JSON.stringify(properties);
}

function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}

var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}

exports.log = function (msg) {};

exports.pump = null;

var Object_keys = Object.keys || function (obj) {
    var res = [];
    for (var key in obj) res.push(key);
    return res;
};

var Object_getOwnPropertyNames = Object.getOwnPropertyNames || function (obj) {
    var res = [];
    for (var key in obj) {
        if (Object.hasOwnProperty.call(obj, key)) res.push(key);
    }
    return res;
};

var Object_create = Object.create || function (prototype, properties) {
    // from es5-shim
    var object;
    if (prototype === null) {
        object = { '__proto__' : null };
    }
    else {
        if (typeof prototype !== 'object') {
            throw new TypeError(
                'typeof prototype[' + (typeof prototype) + '] != \'object\''
            );
        }
        var Type = function () {};
        Type.prototype = prototype;
        object = new Type();
        object.__proto__ = prototype;
    }
    if (typeof properties !== 'undefined' && Object.defineProperties) {
        Object.defineProperties(object, properties);
    }
    return object;
};

exports.inherits = function(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = Object_create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
};

});

require.define("events", function (require, module, exports, __dirname, __filename) {
if (!process.EventEmitter) process.EventEmitter = function () {};

var EventEmitter = exports.EventEmitter = process.EventEmitter;
var isArray = typeof Array.isArray === 'function'
    ? Array.isArray
    : function (xs) {
        return Object.prototype.toString.call(xs) === '[object Array]'
    }
;

// By default EventEmitters will print a warning if more than
// 10 listeners are added to it. This is a useful default which
// helps finding memory leaks.
//
// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
var defaultMaxListeners = 10;
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!this._events) this._events = {};
  this._events.maxListeners = n;
};


EventEmitter.prototype.emit = function(type) {
  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events || !this._events.error ||
        (isArray(this._events.error) && !this._events.error.length))
    {
      if (arguments[1] instanceof Error) {
        throw arguments[1]; // Unhandled 'error' event
      } else {
        throw new Error("Uncaught, unspecified 'error' event.");
      }
      return false;
    }
  }

  if (!this._events) return false;
  var handler = this._events[type];
  if (!handler) return false;

  if (typeof handler == 'function') {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        var args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
    return true;

  } else if (isArray(handler)) {
    var args = Array.prototype.slice.call(arguments, 1);

    var listeners = handler.slice();
    for (var i = 0, l = listeners.length; i < l; i++) {
      listeners[i].apply(this, args);
    }
    return true;

  } else {
    return false;
  }
};

// EventEmitter is defined in src/node_events.cc
// EventEmitter.prototype.emit() is also defined there.
EventEmitter.prototype.addListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('addListener only takes instances of Function');
  }

  if (!this._events) this._events = {};

  // To avoid recursion in the case that type == "newListeners"! Before
  // adding it to the listeners, first emit "newListeners".
  this.emit('newListener', type, listener);

  if (!this._events[type]) {
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  } else if (isArray(this._events[type])) {

    // Check for listener leak
    if (!this._events[type].warned) {
      var m;
      if (this._events.maxListeners !== undefined) {
        m = this._events.maxListeners;
      } else {
        m = defaultMaxListeners;
      }

      if (m && m > 0 && this._events[type].length > m) {
        this._events[type].warned = true;
        console.error('(node) warning: possible EventEmitter memory ' +
                      'leak detected. %d listeners added. ' +
                      'Use emitter.setMaxListeners() to increase limit.',
                      this._events[type].length);
        console.trace();
      }
    }

    // If we've already got an array, just append.
    this._events[type].push(listener);
  } else {
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  var self = this;
  self.on(type, function g() {
    self.removeListener(type, g);
    listener.apply(this, arguments);
  });

  return this;
};

EventEmitter.prototype.removeListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('removeListener only takes instances of Function');
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (!this._events || !this._events[type]) return this;

  var list = this._events[type];

  if (isArray(list)) {
    var i = list.indexOf(listener);
    if (i < 0) return this;
    list.splice(i, 1);
    if (list.length == 0)
      delete this._events[type];
  } else if (this._events[type] === listener) {
    delete this._events[type];
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  // does not use listeners(), so no side effect of creating _events[type]
  if (type && this._events && this._events[type]) this._events[type] = null;
  return this;
};

EventEmitter.prototype.listeners = function(type) {
  if (!this._events) this._events = {};
  if (!this._events[type]) this._events[type] = [];
  if (!isArray(this._events[type])) {
    this._events[type] = [this._events[type]];
  }
  return this._events[type];
};

});

require.define("/screen.js", function (require, module, exports, __dirname, __filename) {
    MODES = { LNM : 20,
          IRM : 4,
          DECTCEM : 25 << 5,
          DECSCNM : 5 << 5,
          DECOM : 6 << 5,
          DECAWM : 7 << 5,
          DECCOLM : 3 << 5
        }
exports.MODES = MODES

//exports.COLORS = ["black","red","green","yellow","blue","magenta","cyan","white","",""]
/*
index
reverseindex
defaultcharset
savecursor
restorecursor
setcharset
defaultcharset
funcname
cursorup
cursordown
cursorfwd
cursorback
cursorpos
eraseindisplay
eraseinline
charattrs
devicestatus
insertchars
cursornextline
cursorprevline
cursorcharabs
insertlines
deletelines
deletechars
erasechars
charsposabs
hposrel
senddevattrs
lineposabs
vposrel
hvpos
setmode
resetmode
setscrollreg
savecursor
restorecursor
cursorfwdtab
scrollup
scrolldown
cursorbacktab
repeatprecchar
*/

function BasicScreen(rows, columns){
    this.rows = rows;
    this.dirty = {};
    this.dirtyAll = false;
    this.cols = columns;
    this.cursor = {x:0, y:0}
    this.margins = {top:0, bottom: rows-1}
    this.defaultLine = function(n){
        var returnval = []
        for(var i=0;i<n;i++){
            returnval.push({d:null})
        }
        return returnval;
    }
    this.data = []
    for(var i=0;i<this.rows;i++){
        this.data.push(this.defaultLine(this.cols))
    }
    this.modes = {}
    this.color = undefined;
    this.reset()
}

BasicScreen.prototype.debug = function(){
    if(this.debugMode){
        console.log.apply(console, arguments)
    }
}

BasicScreen.prototype.ensureBounds = function(){//{{{
    if(this.cursor.y >= this.rows) this.cursor.y = this.rows-1;
    if(this.cursor.y < 0) this.cursor.y = 0;

    if(this.cursor.x >= this.cols) this.cursor.x = this.cols - 1;
    if(this.cursor.x < 0) this.cursor.x = 0;
}//}}}

BasicScreen.prototype.cursorup = function(n){//{{{
    if(!n || n == 0) n = 1
    this.cursor.y -= n;
    this.ensureBounds();
}//}}}

BasicScreen.prototype.cursordown = function(n){//{{{
    if(!n || n == 0) n = 1
    this.cursor.y += n;
    this.ensureBounds();
}//}}}

BasicScreen.prototype.cursorleft = function(n){//{{{
    if(!n || n == 0) n = 1
    this.cursor.x -= n;
    this.ensureBounds();
}//}}}

BasicScreen.prototype.cursorright = function(n){//{{{
    if(!n || n == 0) n = 1
    this.cursor.x += n;
    this.ensureBounds();
}//}}}

BasicScreen.prototype.cursorfwd = function(n){//{{{
    if(!n || n == 0) n = 1
    this.cursor.x += n;
    this.ensureBounds();
}//}}}

BasicScreen.prototype.cursorback = function(n){//{{{
    if(!n || n == 0) n = 1
    this.cursor.x -= n;
    this.ensureBounds();
}//}}}

BasicScreen.prototype.carriagereturn = function(){//{{{
    this.cursor.x = 0;
}//}}}

BasicScreen.prototype.display = function(){//{{{
    var rowStrLen = Number(this.rows).toString().length
    function padToLen(str, len){
        while(str.length < len) str = " " + str
        return str;
    }
    for(var i=0;i<this.rows;i++){
        process.stderr.write("[" + padToLen(Number(i).toString(), rowStrLen) + "]")
        for(var j=0;j<this.cols;j++){
            var outchar = String.fromCharCode(this.data[i][j].d) || " "
            process.stderr.write(outchar)
        }
        process.stderr.write("\n")
    }
}//}}}

BasicScreen.prototype.log = function(){//{{{
    var rowStrLen = Number(this.rows).toString().length
    function padToLen(str, len){
        while(str.length < len) str = " " + str
        return str;
    }
    for(var i=0;i<this.rows;i++){
        var rowtext = ""
        rowtext += "[" + padToLen(Number(i).toString(), rowStrLen) + "]"
        for(var j=0;j<this.cols;j++){
            var outchar = this.data[i][j].d || " "
            rowtext += outchar
        }
    }
}//}}}

BasicScreen.prototype.canvasDisplay = function(context){//{{{
    COL_WIDTH = 8;
    ROW_HEIGHT = 16;
    for(var i=0;i<this.rows;i++){
        for(var j=0;j<this.cols;j++){
            var outchar = this.data[i][j].d
            if(outchar){
                context.fillText(outchar, COL_WIDTH * j + 2, ROW_HEIGHT * (i+1))
            }
        }
    }
}//}}}

BasicScreen.prototype.defaultcharset = function(){
}

BasicScreen.prototype.setcharset = function(){
}

BasicScreen.prototype.eraseinline = function(params){
    if(!params || params[0] == 0){
        for(var i=this.cursor.x;i<this.cols;i++){
            this.data[this.cursor.y][i] = {}
        }
        this.dirty[this.cursor.y] = 1
        //erase from cursor to EOL
    }else if(params[0] == 1){
        for(var i=0;i<=this.cursor.x;i++){
            this.data[this.cursor.y][i] = {}
        }
        this.dirty[this.cursor.y] = 1
        //erase from beginning of line to cursor inclusive
    }else if(params[0] == 2){
        for(var i=0;i<this.cols;i++){
            this.data[this.cursor.y][i] = {}
        }
        this.dirty[this.cursor.y] = 1
        //erase entire line
    }
}
 
BasicScreen.prototype.hvpos = function(){
}

BasicScreen.prototype.resetmode = function(){
}

BasicScreen.prototype.savecursor = function(){
}

BasicScreen.prototype.restorecursor = function(){
}
 

BasicScreen.prototype.senddevattrs = function(){
}
 

BasicScreen.prototype.setmode = function(){
}

BasicScreen.prototype.setscrollreg = function(){
}

BasicScreen.prototype.charattrs = function(){
    //console.log("SGR", arguments)
    if(arguments[0]){
        var colorCode = arguments[0][0];
        switch(colorCode){
            case 0:
                //console.log("resetting color!");
                this.color = undefined;
                this.bold = false;
                this.ul = false;
                this.blink = false;
                this.inverse = false;
                this.invisible = false;
                break;
            case 1:
                this.bold = true;
                break;
            case 4:
                this.ul = true;
                break;
            case 5:
                this.blink = true;
                break;
            case 7:
                this.inverse = true;
                break;
            case 8:
                this.invisible = true;
                break;
            default:
                if(colorCode >= 30 && colorCode <= 39){
                    this.color = colorCode - 30;
                }else if(colorCode >= 40 && colorCode <= 49){
                    this.bg = colorCode - 40;
                }
        }
    }
}

BasicScreen.prototype.eraseindisplay = function(params){
    //0 Erase from the active position to the end of the screen, inclusive (default)
    //1 Erase from start of the screen to the active position, inclusive
    //2 Erase all of the display – all lines are erased, changed to single-width, and the cursor does not move.
    if(!params || params[0] == 0){
        for(var i=this.cursor.y+1;i<this.rows;i++){
            this.data[i] = this.defaultLine(this.cols)
            this.dirty[i] = 1
        }
        this.eraseinline([0])
    }else if(params[0] == 1){
        for(var i=0;i<this.cursor.y;i++){
            this.data[i] = this.defaultLine(this.cols)
            this.dirty[i] = 1
        }
        this.eraseinline([1])
    }else if(params[0] == 2){
        for(var i=0;i<this.rows;i++){
            this.data[i] = this.defaultLine(this.cols)
        }
        this.dirtyAll = true;
    }
}

BasicScreen.prototype.cursorpos = function(params){
    var row = params[0] - 1;
    var col;
    if (params.length >= 2) { 
       col = params[1] - 1; 
    } else {
       col = 0; 
    }
   
    if (row < 0) { 
       row = 0; 
    } else if (row >= this.rows) {
       row = this.rows - 1; 
    }
   
    if (col < 0) { 
       col = 0; 
    } else if (col >= this.cols) {
       col = this.cols - 1; 
    }
    this.cursor = {x:col, y:row} 
}

BasicScreen.prototype.reset = function(){
    //set all the modes to defaults
    this.modes = {}
    this.modes[MODES.DECAWM] = 1
    this.modes[MODES.DECTCEM] = 1
    this.modes[MODES.LNM] = 1
    //this.margins = something
    //this.charset = 0
    //this.tabstops
    this.cursor = {x:0, y:0} // MOB TODO: this should check for DECOM
}

//need to implement:
//  insert_characters (insertCharacters)
BasicScreen.prototype.draw = function(ch){
    /*Display a character at the current cursor position and advance
      the cursor if ~pyte.modes.DECAWM is set.
        :param unicode char: a character to display.
        """
        */
        //# Translating a given character.
        //char = char.translate([self.g0_charset,
                               //self.g1_charset][self.charset])

        //# If this was the last column in a line and auto wrap mode is
        //# enabled, move the cursor to the next line. Otherwise replace
        //# characters already displayed with newly entered.
    if(this.cursor.x == this.cols){
        if(this.modes[MODES.DECAWM] > 0){
            this.linefeed()
        }else{
            this.cursor.x -= 1
        }
    }
    if(this.modes.IRM > 0){
        this.insertChars(1)
    }

    var b = {d:ch, c:this.color}
    if(this.bold) b.bold = true
    this.data[this.cursor.y][this.cursor.x] = b
    this.cursor.x += 1
    this.dirty[this.cursor.y] = 1
}

BasicScreen.prototype.backspace = function(){
    this.cursorback();
}

BasicScreen.prototype.index = function(){
    //TODO handle scroll regions?
    if(this.cursor.y >= this.rows - 1){
        this.cursor.y = this.rows - 1;
        this.data.shift()
        this.data.push(this.defaultLine(this.cols))
        this.dirtyAll = true;
    }else{
        this.cursordown()
    }
}

BasicScreen.prototype.linefeed = function(){
    //MOB TODO this needs to handle creating new lines, margins, etc.
    this.index()
    if(this.modes[MODES.LNM] > 0){
        this.carriagereturn()
    }
}

exports.BasicScreen = BasicScreen

});
require("/screen.js");

require.define("/termstream.js", function (require, module, exports, __dirname, __filename) {
    inherits = require('util').inherits
var STATES = {NORMAL:0, ESC:1, CSI:2, OSC:3, CHARSET:4, OSCIN :5, SKIP:6 }
var debugMode = false;
var SPECIAL_CHARS = 
    {
        NIL  : 0,
        BELL : 7,
        BACKSPACE: 8,
        TAB: 9,
        LF   : 10,
        VT   : 11,
        FF   : 12,
        CR   : 13,
        ESC  : 27,
    }

function BasicStream(){
    this.skipCounter = 0;
    this.state = STATES.NORMAL;
    this.currentParam = 0;
    this.numchars = 0;
}
BasicStream.prototype.attach = function(screen){
    this.screen = screen;
}

BasicStream.prototype.dispatch = function(eventName, params){
    if(this.screen){
        this.screen[eventName](params)
    }
}

function debug(args){
    if(debugMode){
        console.log.apply(console, arguments);
    }
}

BasicStream.prototype.setDebugMode = function(mode, verbose){
    debugMode = mode
    this.verboseMode = verbose
    if(mode==true){
        //this.onAny(function(){
            //console.log("[DEBUG]",arguments);
        //});
    }
}

CSI_FUNCS = {
    65 : "cursorup",                //up down fwd back
    66 : "cursordown",
    67 : "cursorfwd",
    68 : "cursorback",
    72 : "cursorpos",
    74 : "eraseindisplay",
    75 : "eraseinline",
    109 : "charattrs",
    110 : "devicestatus",
    64 : "insertchars",
    69 : "cursornextline",
    70 : "cursorprevline",
    71 : "cursorcharabs",
    76 : "insertlines",
    77 : "deletelines",
    80 : "deletechars",
    88 : "erasechars",
    96 : "charsposabs",
    97 : "hposrel",
    99 : "senddevattrs",
    100 : "lineposabs",
    101 : "vposrel",
    102 : "hvpos",
    104 : "setmode",
    108 : "resetmode",
    114 : "setscrollreg",
    115 : "savecursor",
    117 : "restorecursor",
    73 : "cursorfwdtab",
    83 : "scrollup",
    84 : "scrolldown",
    90 : "cursorbacktab",
    98 : "repeatprecchar",
}


//Expects a single byte as an integer
BasicStream.prototype.feed = function(ch){
    //var str = String.fromCharCode(ch);
    if(ch>=32 && ch <=126){
        strtest = String.fromCharCode(ch)
    }else{
        strtest = ''
    }
    switch(this.state){
        case STATES.SKIP:
            this.skipCounter--;
            if(this.skipCounter==0){
                this.state = STATES.NORMAL;
            }
            break;
        case STATES.NORMAL:
            switch(ch){
                case SPECIAL_CHARS.NIL:
                    break;
                case SPECIAL_CHARS.BELL:
                    this
                case SPECIAL_CHARS.LF:
                case SPECIAL_CHARS.VT:
                case SPECIAL_CHARS.FF:
                    this.dispatch("linefeed");
                    break;
                case SPECIAL_CHARS.CR:
                    this.dispatch("carriagereturn");
                    break;
                case SPECIAL_CHARS.BACKSPACE:
                    this.dispatch("backspace");
                    break;
                case SPECIAL_CHARS.TAB:
                    this.dispatch("tab");
                    break;
                case SPECIAL_CHARS.ESC:
                    this.state = STATES.ESC;
                    break;
                default:
                    this.dispatch("draw", ch)
                    break;
            }
            break;
        case STATES.ESC:
            switch(ch){
                // "["
                case 91:
                    this.state = STATES.CSI
                    this.params = []
                    break;
                case 93:
                    this.state = STATES.OSC
                    this.params = []
                    break

                // ESC P Device Control String ( DCS is 0x90).
                // "P"
                case 80:
                    this.state = STATES.OSC;
                    break;

                // ESC _ Application Program Command ( APC is 0x9f).
                // "_"
                case 95:
                    this.state = STATES.OSC;
                    break;

                    // ESC ^ Privacy Message ( PM is 0x9e).
                    // "^"
                case 94:
                    this.state = STATES.OSC;
                    break;

                    // ESC c Full Reset (RIS).
                    // "^"
                case 99:
                    this.dispatch("reset");
                    break;

                    // ESC E Next Line ( NEL is 0x85).
                    // ESC D Index ( IND is 0x84).
                case 69: //E
                    this.dispatch("nextline")
                        break;
                case 68: //D
                    this.dispatch("index")
                        break;

                    // ESC M Reverse Index ( RI is 0x8d).
                case 77: // M
                    this.dispatch("reverseindex");
                    break;

                    // ESC % Select default/utf-8 character set.
                    // @ = default, G = utf-8
                case 37: // %
                    this.dispatch("defaultcharset")
                        this.skipCounter = 1;
                    this.state = STATES.SKIP;
                    break;

                case 40: // ( <-- this seems to get all the attention
                case 41: // )
                case 42: // *
                case 43: // +
                case 45: // -
                case 46: // .
                    this.state = STATES.CHARSET;
                    break;

                    // Designate G3 Character Set (VT300).
                    // A = ISO Latin-1 Supplemental.
                    // Not implemented.
                case 47:
                    this.charset = null;
                    this.skipCounter = 1;
                    this.state = STATES.SKIP;
                break;
              case 55:
                this.dispatch("savecursor")
                this.state = STATES.NORMAL
                break;
              case 56:
                this.dispatch("restorecursor")
                this.state = STATES.NORMAL
                break;

              // ESC # 3 DEC line height/width
              case 35: // #
                this.skipCounter = 1
                this.state = STATES.SKIP;
                break;

              // ESC H Tab Set ( HTS is 0x88).
              case 72:
                // this.tabSet(this.x);
                this.state = STATES.NORMAL;
                break;

              // ESC = Application Keypad (DECPAM).
              case 61: //'='
                this.applicationKeypad = true;
                this.state = STATES.NORMAL;
                break;

              // ESC > Normal Keypad (DECPNM).
              case 62: //'>'
                this.applicationKeypad = false;
                this.state = STATES.NORMAL;
                break;

              default:
                this.state = STATES.NORMAL;
                break;
            }
            break;
        case STATES.CHARSET:
            switch(ch){
              // DEC Special Character and Line Drawing Set.
              case 48: //'0':
                this.dispatch("setcharset", "scld")
                break;
              // United States (USASCII).
              case 65: //'B':
              default:
                this.dispatch("defaultcharset")
                break;
            }
            break;
        case STATES.OSCIN:
            switch(ch){
                case 59:
                    this.state = STATES.NORMAL;
                    break;
                case 7:
                    this.screen.osc(this.oscprefix, this.oscdata)
                    this.state = STATES.NORMAL;
                    this.oscdata = []
                    break;
                default:
                    this.oscdata[this.oscdata.length] = strtest;
                    break;
            }
            break;
        case STATES.OSC:
            if(ch !== 27 && ch !== 7){
                //just ignore
                break;
            }else if(ch === 27){
                this.skipCounter = 1;
                this.state = STATES.SKIP;
                break;
            }
            /*
            if (ch >= 48 && ch <= 57) {
                this.oscprefix = ch-48;
                this.oscdata = []
                this.state = STATES.OSCIN; 
                debug("oscin state")
            }else if (ch !== 27 && ch !== 7){
                debug('Unknown OSC code.', ch);
                this.state = STATES.NORMAL;
            }else if (ch === 27){
                i++;
                // increment for the trailing slash in ST
            }
            break;*/
        case STATES.CSI:
            if (ch === 63 || ch === 62 || ch === 33) {
              this.prefix = ch;
              break;
            }

            // 0 - 9
            if (ch >= 48 && ch <= 57) {
              this.currentParam = this.currentParam * 10 + ch - 48;
              break;
            }

            // '$', '"', ' ', '\''
            if (ch === 36 || ch === 34 || ch === 32 || ch === 39) {
              this.postfix = ch;
              break;
            }

            this.params[this.params.length] = this.currentParam;
            this.currentParam = 0;

            // ';'
            if (ch === 59) break;

            this.state = STATES.NORMAL;
            var funcname = CSI_FUNCS[ch]
            if(funcname){
                this.dispatch(funcname, this.params)
            }else{
            }
    }
}
exports.BasicStream = BasicStream

});
require("/termstream.js");

require.define("/browserscreen.js", function (require, module, exports, __dirname, __filename) {
    //var COLORS = require('./screen').COLORS
var COLORS = [
    '#000000', //BLACK
    '#98565E',//RED 
    '#66825D',//GREEN 
    '#969176',//YELLOW 
    '#4D6585',//BLUE 
    '#967395',//MAGENTA 
    '#5F7F7B',//CYAN 
    '#BFBFBF']//WHITE 
var BOLDCOLORS = [
    '#000000', //BLACK
    '#CFA3A9',//RED 
    '#CAF7BB',//GREEN 
    '#FFF8BC',//YELLOW 
    '#83A3BE',//BLUE 
    '#BBA9CF',//MAGENTA 
    '#96CCCC',//CYAN 
    '#FFFFFF',//WHITE 
]

COL_WIDTH = 7;
ROW_HEIGHT = 14;
exports.COLORS = ["black","red","green","yellow","blue","magenta","cyan","white","",""]



BrowserScreen = function(screen, context){
    this.screen = screen
    this.context = context;
    this.backgroundColor = '#000'
    this.foregroundColor = '#fff'
    this.setFont("monospace")
}

BrowserScreen.prototype.setFont = function(font){
    this.font = '12px ' + font;
    this.boldFont = 'bold 12px ' + font;
    this.context.font = '12px ' + font;
}


BrowserScreen.prototype.clear = function(){
    this.context.fillStyle = this.backgroundColor;
    if(this.screen.dirtyAll){
        this.context.fillRect(0,0,1000,1000);
        return;
    }
    for(var i in this.screen.dirty){
        this.context.fillRect(0,ROW_HEIGHT * i,1000,ROW_HEIGHT);
    }
}

BrowserScreen.prototype.canvasDisplay = function(){
    //this.context.font = '12px monospace';
    this.context.fillStyle = this.foregroundColor;
    this.context.textBaseline = 'bottom';
    var curColor = undefined;
    for(var i=0;i<this.screen.rows;i++){
        if( !this.screen.dirty[i] && !this.screen.dirtyAll){
            continue;
        }else{
            console.log("redrawing", i);
        }
        //this.screen.dirty[i] = 0;
        for(var j=0;j<this.screen.cols;j++){
            var ch = this.screen.data[i][j]
            var outchar = String.fromCharCode(ch.d)
            if(outchar){
                if(ch.c == undefined){
                    this.foregroundColor = 'white'
                    this.context.fillStyle = this.foregroundColor;
                }else if(ch.c != undefined && ch.c != curColor){
                    curColor = ch.c
                    this.foregroundColor = ch.bold ? BOLDCOLORS[ch.c] : COLORS[ch.c]
                    if(ch.bold){
                        this.context.font = this.font;
                    }else{
                        this.context.font = this.boldFont
                    }
                    this.context.fillStyle = this.foregroundColor;
                    //console.log("color",this.foregroundColor, ch.bold)
                }
                this.context.fillText(outchar, COL_WIDTH * j + 2, ROW_HEIGHT * (i+1))
            }
        }
    }
    this.screen.dirty = {};
    this.screen.dirtyAll = false;
}
exports.BrowserScreen = BrowserScreen


});
require("/browserscreen.js");

require.define("/b64binary.js", function (require, module, exports, __dirname, __filename) {
    var Base64Binary = {
    _keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

    /* will return a  Uint8Array type */
    decodeArrayBuffer: function(input) {
        var bytes = (input.length/4) * 3;
        var ab = new ArrayBuffer(bytes);
        this.decode(input, ab);

        return ab;
    },

    decode: function(input, arrayBuffer) {
        //get last chars to see if are valid
        var lkey1 = this._keyStr.indexOf(input.charAt(input.length-1));      
        var lkey2 = this._keyStr.indexOf(input.charAt(input.length-2));      

        var bytes = (input.length/4) * 3;
        if (lkey1 == 64) bytes--; //padding chars, so skip
        if (lkey2 == 64) bytes--; //padding chars, so skip

        var uarray;
        var chr1, chr2, chr3;
        var enc1, enc2, enc3, enc4;
        var i = 0;
        var j = 0;

        if (arrayBuffer)
            uarray = new Uint8Array(arrayBuffer);
        else
            uarray = new Uint8Array(bytes);

        input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

        for (i=0; i<bytes; i+=3) {  
            //get the 3 octects in 4 ascii chars
            enc1 = this._keyStr.indexOf(input.charAt(j++));
            enc2 = this._keyStr.indexOf(input.charAt(j++));
            enc3 = this._keyStr.indexOf(input.charAt(j++));
            enc4 = this._keyStr.indexOf(input.charAt(j++));

            chr1 = (enc1 << 2) | (enc2 >> 4);
            chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            chr3 = ((enc3 & 3) << 6) | enc4;

            uarray[i] = chr1;           
            if (enc3 != 64) uarray[i+1] = chr2;
            if (enc4 != 64) uarray[i+2] = chr3;
        }

        return uarray;  
    }
}

exports.Base64Binary = Base64Binary


});
require("/b64binary.js");

