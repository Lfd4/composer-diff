#! /usr/bin/env node
var fs = require('fs');
var path = require('path');
var process = require('process');
var child_process = require('child_process');
var program = require('commander');

program
    .option('-d, --dir <path>', 'Path to composer project')
    .parse(process.argv);

var dir = program.dir || process.cwd();
var composerLockPath = path.join(dir, 'composer.lock');

var origLock = getHeadComposerLock();
var newLock = getComposerLock();

Promise.all([origLock, newLock]).then(function(values) {
    var orig = values[0];
    var new_ = values[1];
    var diffs = packageDiff(orig, new_);
    writeCommitMessage(diffs);
}, function(err) {
    console.log("Err: " + err);
});

function writeCommitMessage(diffs) {
    console.log('[TASK] Update packages');
    console.log('');
    diffs.forEach(function(diff) {
	if (diff.version || diff.ref) {
	    var str = '* ' + diff.pkg + ':';
	    if (diff.version) {
		str += ' ' + diff.version.old + ' => ' + diff.version.new;
	    } else if (diff.ref) {
		str += ' ' + diff.ref.old + ' => ' + diff.ref.new;
	    }
	    console.log(str);
	}
    });
}

function commitHash(str) {
    return str.substr(0, 8);
}

function comparePackages(pkg1, pkg2) {
    var diff = {
	pkg: pkg1.name
    };
    if (pkg1.version !== pkg2.version) {
	diff.version = {
	    old: pkg1.version,
	    new: pkg2.version
	};
    }
    if (pkg1.source && pkg1.source.reference &&
	pkg2.source && pkg2.source.reference &&
	pkg1.source.reference !== pkg2.source.reference) {
	diff.ref = {
	    old: commitHash(pkg1.source.reference),
	    new: commitHash(pkg2.source.reference)
	};
    }

    return diff;
}

function packageByName(pkgs, name) {
    var thepkg;
    pkgs.forEach(function(pkg) {
	if (pkg.name === name) {
	    thepkg = pkg;
	    return false;
	}
    });
    return thepkg;
}

function packageDiff(lock1, lock2) {
    var diffs = [];
    var pkgs1 = lock1.packages;
    var pkgs2 = lock2.packages;
    pkgs1.forEach(function(pkg) {
	var pkg2 = packageByName(pkgs2, pkg.name);
	diffs.push(comparePackages(pkg, pkg2));
    });
    return diffs;
}

function getComposerLock() {
    return new Promise(function(resolve, reject) {
	fs.readFile(composerLockPath, 'utf8', function(err, data) {
	    if (err) {
		reject(err);
		return;
	    }
	    resolve(JSON.parse(data));
	});
    });
}

function getHeadComposerLock() {
    return new Promise(function(resolve, reject) {
	var p = child_process.spawn('git', ['show', 'HEAD:composer.lock']);
	var data = '';
	p.stdout.on('data', function(out) {
	    data += out;
	});
	p.stderr.on('data', function(err) {
	    console.log(err);
	});
	p.on('error', function(err) {
	    console.log(err);
	    reject();
	});
	p.on('close', function() {
	    resolve(JSON.parse(data));
	});
    });
}
