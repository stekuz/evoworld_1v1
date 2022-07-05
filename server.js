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
    constructor(name,position,nick,direction){
        this.name=name;
        this.position=position;
        this.nick=nick;
        this.direction=direction;
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
    nick;
    name='reaper';
    direction='right';
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
    constructor(host,map){
        this.map=map;
        this.players.push(host);
        this.id=create_id();
    }
    add_player(token){
        this.players.push(token);
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

//walls

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

//rooms

function create_room(host){
    rooms.free.room=new Room(host);
}

function connect_to_room(token){
    if(rooms.free.available){
        rooms.free.room.add_player(token);
        rooms.busy[rooms.free.room.id]=rooms.free.room;
        players[token].room=rooms.free.room;
        players[token].position.x=map_size.x-players[token].position.x;
        players[token].direction='left';
        rooms.free.available=0;
    }else{
        create_room(token);
        players[token].room=rooms.free.room;
        rooms.free.available=1;
    }
}

//physics for players in rooms

function physics(){
    Object.keys(players).forEach(key_player=>{
        if(players[key_player].room===undefined)return;

        //summing forces

        let sum_force={x:0,y:0};
        if(Object.keys(players[key_player].forces)[0]!==undefined)Object.keys(players[key_player].forces).forEach(key_force=>{
            sum_force.x+=players[key_player].forces[key_force].x;
            sum_force.y+=players[key_player].forces[key_force].y;
        });

        //collisions

        let player1={
            min:{
                x:players[key_player].position.x,
                y:players[key_player].position.y,
            },
            max:{
                x:players[key_player].position.x+players[key_player].width,
                y:players[key_player].position.y+players[key_player].height,
            },
            room:players[key_player].room,
        };
        let player2={
            min:{},
            max:{},
        };

        //walls

        if(player1.min.x<=3*block_size){
            sum_force.x=0;
            players[key_player].forces.side.x=0;
            players[key_player].velocity.x=0;
            players[key_player].position.x+=position_delta;
        }
        if(player1.min.y<=3*block_size){
            sum_force.y=0;
            players[key_player].velocity.y=0;
            players[key_player].position.y+=position_delta;
        }
        if(player1.max.x>=map_size.x+block_size){
            sum_force.x=0;
            players[key_player].forces.side.x=0;
            players[key_player].velocity.x=0;
            players[key_player].position.x-=position_delta;
        }
        if(player1.max.y>=map_size.y+block_size){
            sum_force.y=0;
            players[key_player].velocity.y=0;
            players[key_player].position.y-=position_delta;
        }

        //players

        if(player1.room!==undefined)player1.room.players.forEach(in_room=>{//in_room===token of the player
            if(in_room===key_player||in_room===undefined||players[in_room]===undefined)return;
            player2.min.x=players[in_room].position.x;
            player2.min.y=players[in_room].position.y;
            player2.max.x=players[in_room].position.x+players[in_room].width;
            player2.max.y=players[in_room].position.y+players[in_room].height;

            if((player1.min.x>=player2.min.x&&player1.min.x<=player2.max.x||player1.max.x>=player2.min.x&&player1.max.x<=player2.max.x)&&
            (player1.min.y>=player2.min.y&&player1.min.y<=player2.max.y||player1.max.y>=player2.min.y&&player1.max.y<=player2.max.y)){
                let velocity_sum={
                    x:players[key_player].velocity.x+players[in_room].velocity.x,
                    y:players[key_player].velocity.y+players[in_room].velocity.y,
                };

                if(players[key_player].velocity.x>0!==players[in_room].velocity.x>0){
                    players[key_player].velocity.x=velocity_sum.x;
                    players[in_room].velocity.x=velocity_sum.x;
                    players[key_player].position.x+=position_delta*(-1+2*(player1.min.x>player2.min.x));
                }
                if(players[key_player].velocity.y>0!==players[in_room].velocity.y>0){
                    players[key_player].velocity.y=velocity_sum.y;
                    players[in_room].velocity.y=velocity_sum.y;
                    players[key_player].position.y+=position_delta*(-1+2*(player1.min.y>player2.min.y));
                }
            }
        });

        //forces to velocity and repositioning

        players[key_player].velocity.x+=sum_force.x/mass*delta_time;
        players[key_player].velocity.y+=sum_force.y/mass*delta_time;
        players[key_player].position.x+=players[key_player].velocity.x;
        players[key_player].position.y+=players[key_player].velocity.y;
        players[key_player].velocity.x*=velocity_friction;
        if(!players[key_player].side_force)players[key_player].forces.side.x*=force_friction;
    });
}

//info via *socket*

function info_to_player(socket,token){
    if(players[token]===undefined)return;
    let map_to_draw=[],players_to_draw=[],player=players[token];

    let min_x=Math.max(0,Math.floor((player.position.x-player.canvas.width/2-2*block_size)/(2*block_size))*2*block_size);
    let min_y=Math.max(0,Math.floor((player.position.y-player.canvas.height/2-2*block_size)/(2*block_size))*2*block_size);

    let max_x=Math.min(map_size.x-block_size,Math.floor((player.position.x+player.canvas.width/2+2*block_size)/(2*block_size))*2*block_size);
    let max_y=Math.min(map_size.y-block_size,Math.floor((player.position.y+player.canvas.height/2+2*block_size)/(2*block_size))*2*block_size);

    //map

    for(let x=min_x;x<=max_x;x+=block_size){
        for(let y=min_y;y<=max_y;y+=block_size){
            if(initial_map[x][y]!==undefined)map_to_draw.push(new Game_object(initial_map[x][y].name,{x:x,y:y}));
        }
    }

    //players

    if(player.room!==undefined)player.room.players.forEach(in_room=>{//in_room===token of the player
        if(in_room===token||in_room===undefined||players[in_room]===undefined)return;
        players_to_draw.push(new Game_object(
            players[in_room].name,
            {x:players[in_room].position.x,y:players[in_room].position.y},
            players[in_room].nick,
            players[in_room].direction
            ));
    });

    socket.emit(socket_message.get_info,player);
    socket.emit(socket_message.map_to_draw,map_to_draw);
    socket.emit(socket_message.players_to_draw,players_to_draw);
}

//sockets

Io.on('connection', (socket)=>{
    let get_interval=setInterval(()=>{},1000000);
    let side_force_timeout=setTimeout(()=>{},10000);

    socket.on(socket_message.init_room, (player)=>{
        socket.emit(socket_message.enter_room,connect_to_room(player.token));
        players[player.token].nick=player.nick;
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
        players[token].direction='left';
        clearTimeout(side_force_timeout);
        side_force_timeout=setTimeout(()=>{players[token].side_force=false},5*interval_time);
    });

    socket.on(socket_message.button.right, (token)=>{
        players[token].forces.side.x=Math.min(side_delta,players[token].forces.side.x+2*block_size*delta_time);
        players[token].side_force=true;
        players[token].direction='right';
        clearTimeout(side_force_timeout);
        side_force_timeout=setTimeout(()=>{players[token].side_force=false},5*interval_time);
    });
});

setInterval(physics,interval_time);