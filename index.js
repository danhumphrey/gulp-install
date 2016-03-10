'use strict';

var gutil = require('gulp-util');
var path = require("path");
var through2 = require('through2');

var commandRunner = require('./lib/commandRunner');

var cmdMap = {
  'tsd.json': {
    cmd: 'tsd',
    args: ['reinstall', '--save']
  },
  'bower.json': {
    cmd: 'bower',
    args: ['install', '--config.interactive=false']
  },
  'package.json': {
    cmd: 'npm',
    args: ['install']
  },
  'requirements.txt': {
    cmd: 'pip',
    args: ['install', '-r', 'requirements.txt']
  }
};

function log() {
  if(process.env.NODE_ENV !== "test") {
    gutil.log.apply(gutil, [].slice.call(arguments));
  }
}

function formatCommands(cmds) {
  return cmds.map(formatCommand).join(' && ');
}

function formatCommand(command) {
  return command.cmd + ' ' + command.args.join(' ');
}

function formatArguments(args) {
  if (Array.isArray(args)) {
    args.forEach(function(arg, index, arr) {
      arr[index] = formatArgument(arg);
    });
    return args;
  } else if (typeof args === 'string' || args instanceof String) {
    return [ formatArgument(args) ];
  } else {
    log('Arguments are in an invalid format: ' + args);
    return [];
  }
}

function formatArgument(arg) {
  var result = arg;
  while (!result.match(/--.*/)) {
    result = '-' + result;
  }
  return result;
}

function skipInstall() {
  return process.argv.indexOf('--skip-install') >= 0;
}

function clone(obj) {
  if (Array.isArray(obj)) {
    return obj.map(clone);
  } else if (typeof obj === 'object') {
    var copy = {};
    Object.keys(obj).forEach(function(key) {
      copy[key] = clone(obj[key]);
    });
    return copy;
  } else {
    return obj;
  }
}

module.exports = exports = function install() {
  var opts = null;
  var callback = null;
  for(var i = 0; i < arguments.length; i++) {
    var arg = arguments[i];
    var type = typeof(arg);
    if(type === "function") {
      callback = arg;
    }
    else if(type === "object") {
      opts = arg;
    }
  }
  
  var commands = [];
  var captureCommands = function(file, enc, cb) { 
    var self = this;

     if (!file.path) {
      return cb();
    }
    var command = clone(cmdMap[path.basename(file.path)]);

    if (command) {
      if (opts && opts.production) {
        command.args.push('--production');
      }
      if (opts && opts.ignoreScripts) {
        command.args.push('--ignore-scripts');
      }
      if (opts && opts.args) {
        formatArguments(opts.args).forEach(function(arg) {
          command.args.push(arg);
        });
      }
      if (command.cmd === 'bower' && opts && opts.allowRoot) {
        command.args.push('--allow-root');
      }
      if (command.cmd === 'npm' && opts && opts.noOptional) {
        command.args.push('--no-optional');
      }

      command.cwd = path.dirname(file.path);
      commands.push(command);
    }
    
    runCommands(function() {
      self.push(file);
      cb();
    });
  }
  var runCommands = function(cb) {
    if (!commands.length) {
      return;
    }
    if (skipInstall()) {
      log('Skipping install.', 'Run `' + gutil.colors.yellow(formatCommands(commands)) + '` manually');
      return;
    } 
    else {
      var i = 0;
      var maxI = commands.length;
        
      var next = function(err) {
        if(err) {
          callback(err);
        }
        else if(i < maxI) {
          var command = commands[i++];
          commandRunner.run(command, next);
        }
        else {
          if(callback) {
            callback();
          }
          cb();
        }
      }
      next();
    }
  };
  
  return through2.obj(captureCommands);
};