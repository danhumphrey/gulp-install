var childProcess = require('child_process');
var which = require('which');

exports.run = function run (command, cb) {
  which(command.cmd, function(err, cmdpath) {
    if (err) {
      return cb(new Error('Can\'t install! `' + command.cmd + '` doesn\'t seem to be installed.'));
    }
    
    var cmd = childProcess.spawn(cmdpath, command.args, { stdio: 'inherit', cwd: command.cwd || process.cwd() });
    cmd.on('exit', function (code) {
      cb((code === 0) ? null : new Error(command.cmd + ' exited with non-zero code ' + code));
    });
  });
};
