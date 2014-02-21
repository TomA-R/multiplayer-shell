var express = require('express'),
	app = express(),
	http = require('http'),
	server = http.createServer(app),
	io = require('socket.io').listen(server),
	spawn = require('child_process').spawn,
	sys   = require('sys'),
	util  = require('util');

// Some browsers don't support websockets - set timeout to 10
io.configure(function () {
	io.set("transports", ["xhr-polling"]);
	io.set("polling duration", 10);
});

var shell = spawn('bash');
var usernames = {};


server.listen(8080);

app.get('/', function (req, res) {
	res.sendfile(__dirname + '/index.html');
});

io.sockets.on('connection', function (socket) {
	socket.on('sendCommand', function (data) {
		io.sockets.emit('sendCommand', socket.username, data);
		shell.stdin.write(data + "\n");
	});

	socket.on('adduser', function (username) {
		socket.username = username;
		usernames[username] = username;
		socket.emit('systemMsg', 'You are now connected!');
		socket.broadcast.emit('systemMsg', username + ' connected');
		io.sockets.emit('updateusers', usernames);
	});

	socket.on('disconnect', function () {
		delete usernames[socket.username];
		io.sockets.emit('updateusers', usernames);
		socket.broadcast.emit('systemMsg', socket.username + ' disconnected');
	});

	// Shell bindings
	shell.stdout.on('data', function(data) {
		var buff = new Buffer(data),
			result = buff.toString('utf8');
		socket.broadcast.emit('systemMsg', result);
	});

	shell.stderr.on('data', function(data) {
		var buff = new Buffer(data),
			result = buff.toString('utf8');
		socket.broadcast.emit('systemMsg', result);
	});

	shell.on('exit', function (code) {
		socket.broadcast.emit('systemMsg', 'Shell exited with code: ' + code);
	});
});
