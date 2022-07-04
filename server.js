const create_id=require('uuid').v1;
const express=require('express');
const app=express();
const path=require('path');
const server=require('http').createServer(app);
const Io=require('socket.io')(server);

app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(express.static('front'));
app.get('/',(req,res)=>{
	res.sendFile(path.join(__dirname,'front','index.html'));
});
server.listen(80,()=>console.log('run!'));

class Room_guest{
    constructor(token,socket){
        this.token=token;
        this.socket=socket;
    }
}

class Game_object{
    constructor(name,position){
        this.name=name;
        this.position=position;
    }
}

class Wall{
    name="wall";
    constructor(x,y){
        this.x=x;
        this.y=y;
    }
    width=50;
    height=50;
}

class Force{
    constructor(x,y){
        this.x=x;
        this.y=y;
    }
}

class Player{
    side_force=false;
    constructor(canvas){
        this.canvas=canvas;
    }
    room;
    name;
    position={
        x:200,
        y:200,
    };
    mass=10;
    width=65;
    height=100;
    forces={
        side:new Force(0,0),
    };
    velocity={
        x:0,
        y:0,
    };
}

class Room{
    players=[];
    constructor(socket,host,map){
        this.map=map;
        this.players.push(host,socket);
        this.id=create_id();
    }
    add_player(token,socket){
        this.players.push(token,socket);
    }
}

const socket_message={
    players_to_draw:11,
    map_to_draw:12,
    get_info:13,
    button:{
        hit:14,
        up:15,
        left:16,
        right:17,
    },
    enter_room:18,
    init_room:19,
    init_player:20,
};

const rooms={
    free:{
        available:0,
    },
    busy:{},
};

const players={};
const gravity=new Force(0,5);
const interval_time=20,delta_time=0.4,mass=10,velocity_friction=0.82,force_friction=0.99,up_delta=20,side_delta=40,block_size=50,position_delta=0.4;

//initial map

const map_size={x:4000,y:2000},initial_map=[],map_objects=[];

for(let x=0;x<=map_size.x;x+=block_size)initial_map[x]=[];

for(let y=0;y<=map_size.y;y+=block_size){
    initial_map[0][y]=new Wall(0,y);
    map_objects.push(new Wall(0,y));
    initial_map[map_size.x-block_size][y]=new Wall(map_size.x-block_size,y);
    map_objects.push(new Wall(map_size.x-block_size,y));
}

for(let x=block_size;x<=map_size.x-block_size;x+=block_size){
    initial_map[x][0]=new Wall(x,0);
    map_objects.push(new Wall(x,0));
    initial_map[x][map_size.y-block_size]=new Wall(x,map_size.y-block_size);
    map_objects.push(new Wall(x,map_size.y-block_size));
}

//functions

function create_room(host,socket){
    rooms.free.room=new Room(host,socket);
}

function connect_to_room(token,socket){
    if(rooms.free.available){
        rooms.free.room.add_player(token,socket);
        rooms.busy[rooms.free.room.id]=rooms.free.room;
        rooms.free.available=0;
        return rooms.free.room;
    }else{
        create_room(token,socket);
        rooms.free.available=1;
    }
}

function physics(){
    Object.keys(players).forEach(key_player=>{
        if(players[key_player].room===undefined)return;
        let sum_force={x:0,y:0};

        //summing forces

        if(Object.keys(players[key_player].forces)[0]!==undefined)Object.keys(players[key_player].forces).forEach(key_force=>{
            sum_force.x+=players[key_player].forces[key_force].x;
            sum_force.y+=players[key_player].forces[key_force].y;
        });

        //collisions

        let player={
            min:{
                x:players[key_player].position.x,
                y:players[key_player].position.y,
            },
            max:{
                x:players[key_player].position.x+players[key_player].width,
                y:players[key_player].position.y+players[key_player].height,
            },
        };

        if(player.min.x<=3*block_size){
            sum_force.x=0;
            players[key_player].forces.side.x=0;
            players[key_player].velocity.x=0;
            players[key_player].position.x+=position_delta;
        }
        if(player.min.y<=3*block_size){
            sum_force.y=0;
            players[key_player].velocity.y=0;
            players[key_player].position.y+=position_delta;
        }
        if(player.max.x>=map_size.x+block_size){
            sum_force.x=0;
            players[key_player].forces.side.x=0;
            players[key_player].velocity.x=0;
            players[key_player].position.x-=position_delta;
        }
        if(player.max.y>=map_size.y+block_size){
            sum_force.y=0;
            players[key_player].velocity.y=0;
            players[key_player].position.y-=position_delta;
        }

        //forces to velocity and repositioning

        players[key_player].velocity.x+=sum_force.x/mass*delta_time;
        players[key_player].velocity.y+=sum_force.y/mass*delta_time;
        players[key_player].position.x+=players[key_player].velocity.x;
        players[key_player].position.y+=players[key_player].velocity.y;
        players[key_player].velocity.x*=velocity_friction;
        if(!players[key_player].side_force)players[key_player].forces.side.x*=force_friction;
    });
}

function info_to_player(socket,token){
    if(players[token]===undefined)return;
    let map_to_draw=[],players_to_draw=[],player=players[token];

    let min_x=Math.max(0,Math.floor((player.position.x-player.canvas.width/2-2*block_size)/(2*block_size))*2*block_size);
    let min_y=Math.max(0,Math.floor((player.position.y-player.canvas.height/2-2*block_size)/(2*block_size))*2*block_size);

    let max_x=Math.min(map_size.x-block_size,Math.floor((player.position.x+player.canvas.width/2+2*block_size)/(2*block_size))*2*block_size);
    let max_y=Math.min(map_size.y-block_size,Math.floor((player.position.y+player.canvas.height/2+2*block_size)/(2*block_size))*2*block_size);

    for(let x=min_x;x<=max_x;x+=block_size){
        for(let y=min_y;y<=max_y;y+=block_size){
            if(initial_map[x][y]!==undefined)map_to_draw.push(new Game_object(initial_map[x][y].name,{x:x,y:y}));
        }
    }

    socket.emit(socket_message.get_info,player);
    socket.emit(socket_message.map_to_draw,map_to_draw);
    //socket.emit(socket_message.players_to_draw,players_to_draw);
}

//sockets

Io.on('connection', (socket)=>{
    let get_interval=setInterval(()=>{},1000000);
    let side_force_timeout=setTimeout(()=>{},10000);

    socket.on(socket_message.init_room, (player)=>{
        socket.emit(socket_message.enter_room,connect_to_room(player.token,socket));
        players[player.token].name=player.name;
        players[player.token].forces.gravity=gravity;
        console.log(players);
    });

    socket.on(socket_message.init_player, (canvas)=>{
        let token=create_id();
        players[token]=new Player(canvas);
        socket.emit(socket_message.init_player, token);
        clearInterval(get_interval);
        get_interval=setInterval(info_to_player,interval_time,socket,token);
        console.log(players);
    });

    socket.on(socket_message.button.up, (token)=>players[token].velocity.y=-1*up_delta*delta_time);

    socket.on(socket_message.button.left, (token)=>{
        players[token].forces.side.x=Math.max(-side_delta,players[token].forces.side.x-2*block_size*delta_time);
        players[token].side_force=true;
        clearTimeout(side_force_timeout);
        side_force_timeout=setTimeout(()=>{players[token].side_force=false},2*block_size);
    });

    socket.on(socket_message.button.right, (token)=>{
        players[token].forces.side.x=Math.min(side_delta,players[token].forces.side.x+2*block_size*delta_time);
        players[token].side_force=true;
        clearTimeout(side_force_timeout);
        side_force_timeout=setTimeout(()=>{players[token].side_force=false},2*block_size);
    });
});

setInterval(physics,interval_time);