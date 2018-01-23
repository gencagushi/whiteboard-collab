// server.js
var express = require('express'); 
var app = express();  
var server = require('http').createServer(app);  
var io = require('socket.io')(server);
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var db;
let roomClients = [];

app.use(express.static(__dirname + '/node_modules'));  
app.use(express.static('public'));
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js'));

app.get('/', function(req, res,next) {  
	res.sendFile(__dirname + '/public/index.html');
});

//mongose to use schema for mognodb
mongoose.connect('mongodb://gencagushi:gencushi@ds111608.mlab.com:11608/whiteboard');

// create a schema
var roomSchema = new Schema({
	id: Number,
	coordinates:[{
		x0: Number,
		x1: Number,
		y0: Number,
		y1: Number,
		color: String
	}]
});

// model creation
var Room = mongoose.model('Room', roomSchema);

// make this available to our users in our Node applications
module.exports = Room;

//connection of sockets
io.on('connection', function(client) {  

	var roomId;
	var room;

	client.on('messages', function(data) {
		console.log('Client connected...');
		client.join(data.roomId);

		if (data){

			client.emit('success', data.roomId);

			roomId = data.roomId;

           	//check if room exists 
           	Room.findOne({ 'id': roomId}, function (err, room) {
           		if (err) throw err;

           		if (room){
           			console.log('Joined Room '+room.id);

           			//draw existing drawings on room canvas
           			client.emit('roomHistory',room);

           			//fill room clients data structure 
           			roomClients.forEach(function(element) {
           				if (element.roomid == roomId) {
           					element.clients.push({name:data.name, id:client.id});
           				}
           			});

           		}
           		else {
           			console.log('Room does not exist');

		           	//fill room clients data structure 
		           	roomClients.push({roomid: roomId, clients:[{name:data.name,id:client.id}]});

		           	//create new room
		           	var room = new Room({ id: roomId });

		            //save room
		            room.save(function(err) {
		            	if (err) throw err;
		            	console.log('Room ' +room.id+ ' created successfully!');
		            });
		        }
		    })
           }
           else {
           		client.emit('err', 'Error');
           }
       });

	//broadcast the drawings on all connected clients
	client.on('drawing', function(data) {

		client.broadcast.to(roomId).emit('drawing', data, 10)

		var coordinate = {x0:data.x0,x1:data.x1,y0:data.y0,y1:data.y1,color:data.color};

		// stores all the coordinates in the database
		Room.findOneAndUpdate(
			{id:roomId},
			{$push: {coordinates: coordinate}},
			{safe: true, upsert: true},
			function(err, model) {
		        //console.log(err);
		    }
		);
	});

	//disconnect the client
	client.on('disconnect', function() {
		console.log('Got disconnected!');

		//remove the client from the list of connected users
		roomClients.forEach(function(element) {
			if (element.roomid == roomId) {
				for (var i =0; i < element.clients.length; i++){
					if (element.clients[i].id == client.id){
						element.clients.splice(i,1);
					}
				}
			}

		});
	});

	//sends all connected users to the client
	client.on('getroomusers', function(data) {

		var connections = [];

		roomClients.forEach(function(element) {
			if (element.roomid == roomId) {
				connections = element.clients.slice();
			}

		});

		client.emit('sendclientarray',connections);

	});
});

server.listen(4200);





