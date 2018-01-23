
$(document).ready(function() {

  // the current user
  var user;

  //the current room Id;
  var roomId; 

  //socket connection 
  var socket = io.connect();

  //User Class 
  class User {
    constructor(name) {
      this.name = name;
    }

    //Enter the room based on the given room Id
    enterRoom(roomId, name) {
      socket.emit('messages', {roomId: roomId, name:name });
    }
  }

  //display room canvas on success login
  socket.on('success', function(data) {
    $('#room-section').show();
    $('#login-section').hide();
    $('#whiteboard-room-id').text("Room " +data);
  });

  socket.on('err', function(data) {
   $('#error-message').append(data+ "<br/>");
   $('#room-message-error').show();
 });

  //form to enter room 
  $('form').submit(function(e){
    e.preventDefault();
    $('#room-message-error').hide();
    roomId = $('#roomId').val();
    var name = $('#name').val();
    $('#username-text').text(name);
    user = new User(name);
    user.enterRoom(roomId, name);
    
  });

  $("[data-hide]").on("click", function(){
    $(this).closest("." + $(this).attr("data-hide")).hide();
  });

  $('#exit-room').on("click", function(){
    leaveRoom();
  });

  $('#connected-users').on("click", function(){
    socket.emit('getroomusers', 'message');
  });

  $('#exampleModalCenter').on('hidden.bs.modal', function () {
    $( "#connected-users-modal-body").empty();
  })


  //whiteboard
  var canvas = document.getElementsByClassName('whiteboard')[0];
  var colors = document.getElementsByClassName('color');
  var context = canvas.getContext('2d');

  var current = {
    color: 'black'
  };
  var drawing = false;

  //adding event listeners to detect mouse changes
  canvas.addEventListener('mousedown', onMouseDown, false);
  canvas.addEventListener('mouseup', onMouseUp, false);
  canvas.addEventListener('mouseout', onMouseUp, false);
  canvas.addEventListener('mousemove', throttle(onMouseMove, 10), false);

  for (var i = 0; i < colors.length; i++){
    colors[i].addEventListener('click', onColorUpdate, false);
  }

  socket.on('roomHistory', drawAllHistory);
  socket.on('drawing', onDrawingEvent);
  socket.on('sendclientarray', displayAllConnectedUsers);

  window.addEventListener('resize', onResize, false);
  onResize();

  //drawing lines on canvas
  function drawLine(x0, y0, x1, y1, color, emit){
    context.beginPath();
    context.moveTo(x0, y0);
    context.lineTo(x1, y1);
    context.strokeStyle = color;
    //if (color == 'white') { context.lineWidth = 15; }
    context.lineWidth = 3;
    context.stroke();
    context.closePath();

    if (!emit) { return; }
    var w = canvas.width;
    var h = canvas.height;

    socket.emit('drawing', {
      x0: x0 / w,
      y0: y0 / h,
      x1: x1 / w,
      y1: y1 / h,
      color: color
    });
  }

  function onMouseDown(e){
    drawing = true;
    current.x = e.clientX;
    current.y = e.clientY;
  }

  function onMouseUp(e){
    if (!drawing) { return; }
    drawing = false;
    drawLine(current.x, current.y, e.clientX, e.clientY, current.color, true);
  }

  function onMouseMove(e){
    if (!drawing) { return; }
    drawLine(current.x, current.y, e.clientX, e.clientY, current.color, true);
    current.x = e.clientX;
    current.y = e.clientY;
  }

  function onColorUpdate(e){
    current.color = e.target.className.split(' ')[1];
  }

  // limit the number of events per second
  function throttle(callback, delay) {
    var previousCall = new Date().getTime();
    return function() {
      var time = new Date().getTime();

      if ((time - previousCall) >= delay) {
        previousCall = time;
        callback.apply(null, arguments);
      }
    };
  }

  function onDrawingEvent(data){
    var w = canvas.width;
    var h = canvas.height;
    drawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color);
  }

  // make the canvas fill its parent
  function onResize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  } 

  function drawAllHistory(data){

    var w = canvas.width;
    var h = canvas.height;

    data.coordinates.forEach(function(element) {
      drawLine(element.x0 * w, element.y0 * h, element.x1 * w, element.y1 * h, element.color);
    });
  }

  function leaveRoom(){
    $('#room-section').hide();
    $('#login-section').show();
    window.location.reload();
  }

  function displayAllConnectedUsers(data){
    data.forEach(function(element) {
      $( "#connected-users-modal-body").append( "<div class='online-user'><span class='online'></span><p>"+element.name+"<p></div>" );
    });
  }

});


