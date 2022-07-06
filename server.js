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

class Game_object{
    constructor(name,position,nick,direction,health){
        this.name=name;
        this.position=position;
        this.nick=nick;
        this.direction=direction;
        this.health=health;
    }
}

class Wall{
    name='wall';
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
    scythe={
        position:{
            x:265,
            y:195,
        },
        width:35,
        height:130,
    };
    damage=35;
    health=100;
    room;
    nick;
    name='reaper';
    direction='right';
    can_hit=true;
    position={
        x:200,
        y:200,
    };
    mass=10;
    width=65;
    height=100;
    forces={
        side:new Force(0,0),
        gravity:new Force(0,5),
    };
    velocity={
        x:0,
        y:0,
    };
}

class Room{
    players=[];
    constructor(token,map){
        this.map=map;
        this.players.push(token);
    }
    add_player(token){
        players[this.players[0]].position={x:200,y:200};
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
    enter_room:{
        create:18,
        connect:19,
        random:20,
    },
    init_room:21,
    init_player:22,
};

const random_rooms={
    free:{
        available:0,
    },
    busy:{},
};

const created_rooms={};

const players={};
const //scale
interval_time=20,
delta_time=0.4,
mass=10,
velocity_friction=0.8,
force_friction=0.99,
up_delta=20,
side_delta=1.4,
block_size=50,
position_delta=0.4,
damage=50,
hit_delta=500;

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

//tokens

function rand8(){
    return(Math.floor(Math.random()*100000000));
}

function create_token(){
    let token='';
    for(let i=0;i<3;i++){
        token+=rand8();
        token+='-';
    }
    token+=rand8();
    return token;
}

//rooms

function create_random_room(token){
    random_rooms.free.room=new Room(token);
}

function create_player_room(token){
    let room_id=create_token();
    created_rooms[room_id]=new Room(token);
    players[token].room=created_rooms[room_id];
    return room_id;
}

function connect_to_player_room(token,room_id){
    created_rooms[room_id].add_player(token);
    players[token].room=created_rooms[room_id];
    players[token].position.x=map_size.x-players[token].position.x;
    players[token].direction='left';
}

function connect_to_random_room(token){
    if(random_rooms.free.available){
        let room_id=create_token();
        random_rooms.free.room.add_player(token);
        random_rooms.busy[room_id]=random_rooms.free.room;
        players[token].room=random_rooms.free.room;
        players[token].position.x=map_size.x-players[token].position.x;
        players[token].direction='left';
        random_rooms.free.available=0;
    }else{
        create_random_room(token);
        players[token].room=random_rooms.free.room;
        random_rooms.free.available=1;
    }
}

//physics for players in rooms

function is_collision(object1,object2){//object~{position{x,y},width,height}
    return ((object1.position.x>=object2.position.x&&object1.position.x<=object2.position.x+object2.width||object1.position.x+object1.width>=object2.position.x&&object1.position.x+object1.width<=object2.position.x+object2.width)&&
    (object1.position.y>=object2.position.y&&object1.position.y<=object2.position.y+object2.height||object1.position.y+object1.height>=object2.position.y&&object1.position.y+object1.height<=object2.position.y+object2.height));
}

function hit(token){
    if(players[token]===undefined)return;
    if(players[token].success)return;
    if(players[token].room===undefined)return;

    players[token].room.players.forEach(player=>{//player~token
        if(token===player||player===undefined)return;

        if(is_collision(players[player],players[token].scythe)){
            players[player].health-=players[token].damage;
            players[token].success=true;
        }
    });
}

function physics(){
    Object.keys(players).forEach(key_player=>{
        if(players[key_player].room===undefined)return;

        //collisions

        let force_sum={
            x:players[key_player].forces.side.x,
            y:players[key_player].forces.gravity.y,
        };
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

        //players

        if(player1.room!==undefined)player1.room.players.forEach(in_room=>{//in_room~token
            if(in_room===key_player||in_room===undefined||players[in_room]===undefined)return;
            player2.min.x=players[in_room].position.x;
            player2.min.y=players[in_room].position.y;
            player2.max.x=players[in_room].position.x+players[in_room].width;
            player2.max.y=players[in_room].position.y+players[in_room].height;

            //is collision?

            if(is_collision(players[key_player],players[in_room])){
                let velocity_sum={
                    x:players[key_player].velocity.x+players[in_room].velocity.x,
                    y:players[key_player].velocity.y+players[in_room].velocity.y,
                };
                force_sum.x+=players[in_room].forces.side.x;

                //x velocity

                if(players[key_player].velocity.x>=0!==players[in_room].velocity.x>=0){
                    players[key_player].velocity.x=velocity_sum.x;
                    players[in_room].velocity.x=velocity_sum.x;
                    players[key_player].position.x+=position_delta*4*(-1+2*(player1.min.x>player2.min.x));
                    players[in_room].position.x+=position_delta*4*(1-2*(player1.min.x>player2.min.x));
                }else{
                    if(Math.abs(players[key_player].velocity.x)>Math.abs(players[in_room].velocity.x)){
                        players[key_player].velocity.x=players[key_player].velocity.x
                        players[in_room].velocity.x=players[key_player].velocity.x;
                    }else{
                        players[key_player].velocity.x=players[in_room].velocity.x
                        players[in_room].velocity.x=players[in_room].velocity.x;
                    }
                    players[key_player].position.x+=position_delta*4*(-1+2*(player1.min.x>player2.min.x));
                    players[in_room].position.x+=position_delta*4*(1-2*(player1.min.x>player2.min.x));
                }

                //y velocity 

                if(players[key_player].velocity.y>=0!==players[in_room].velocity.y>=0){
                    players[key_player].velocity.y=velocity_sum.y;
                    players[in_room].velocity.y=velocity_sum.y;
                    players[key_player].position.y+=position_delta*4*(-1+2*(player1.min.y>player2.min.y));
                    players[in_room].position.y+=position_delta*4*(1-2*(player1.min.y>player2.min.y));
                }else{
                    if(Math.abs(players[key_player].velocity.y)>Math.abs(players[in_room].velocity.y)){
                        players[key_player].velocity.y=players[key_player].velocity.y
                        players[in_room].velocity.y=players[key_player].velocity.y;
                    }else{
                        players[key_player].velocity.y=players[in_room].velocity.y
                        players[in_room].velocity.y=players[in_room].velocity.y;
                    }
                    players[key_player].position.y+=position_delta*4*(-1+2*(player1.min.y>player2.min.y));
                    players[in_room].position.y+=position_delta*4*(1-2*(player1.min.y>player2.min.y));
                }

                //x force

                if(players[key_player].forces.side.x>0!==players[in_room].forces.side.x>0){
                    players[key_player].forces.side.x=force_sum.x;
                    players[in_room].forces.side.x=force_sum.x;
                }else{
                    if(Math.abs(players[key_player].forces.side.x)>Math.abs(players[in_room].forces.side.x)){
                        players[key_player].forces.side.x=players[key_player].forces.side.x
                        players[in_room].forces.side.x=players[key_player].forces.side.x;
                    }else{
                        players[key_player].forces.side.x=players[in_room].forces.side.x
                        players[in_room].forces.side.x=players[in_room].forces.side.x;
                    }
                }
            }
        });

        //walls

        if(player1.min.x<=3*block_size){
            force_sum.x=0;
            players[key_player].forces.side.x=0;
            players[key_player].velocity.x=0;
            players[key_player].position.x+=position_delta;
        }
        if(player1.min.y<=3*block_size){
            force_sum.y=0;
            players[key_player].velocity.y=0;
            players[key_player].position.y+=position_delta;
        }
        if(player1.max.x>=map_size.x+block_size){
            force_sum.x=0;
            players[key_player].forces.side.x=0;
            players[key_player].velocity.x=0;
            players[key_player].position.x-=position_delta;
        }
        if(player1.max.y>=map_size.y+block_size){
            force_sum.y=0;
            players[key_player].velocity.y=0;
            players[key_player].position.y-=position_delta;
        }

        //forces to velocity and repositioning

        players[key_player].velocity.x+=players[key_player].forces.side.x/mass*delta_time;
        players[key_player].velocity.y+=players[key_player].forces.gravity.y/mass*delta_time;
        players[key_player].position.x+=players[key_player].velocity.x;
        players[key_player].position.y+=players[key_player].velocity.y;
        players[key_player].velocity.x*=velocity_friction;
        if(!players[key_player].side_force)players[key_player].forces.side.x*=force_friction;

        //scythe 

        players[key_player].scythe.position.y=players[key_player].position.y-5;
        if(players[key_player].direction==='right')players[key_player].scythe.position.x=players[key_player].position.x+players[key_player].width;
        else players[key_player].scythe.position.x=players[key_player].position.x-players[key_player].scythe.width;
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
            players[in_room].direction,
            players[in_room].health
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

    socket.on(socket_message.init_room, (player,type)=>{
        if(player===undefined)return;
        if(players[player.token]===undefined)return;

        console.log(type);
        if(type==='random'){
            socket.emit(socket_message.enter_room.random,connect_to_random_room(player.token));
            players[player.token].nick=player.nick;
        }

        if(type==='create'){
            players[player.token].nick=player.nick;
            socket.emit(socket_message.enter_room.create,create_player_room(player.token));
        }

        if(type==='connect'){
            if(created_rooms[player.room_id]===undefined)return;
            connect_to_player_room(player.token,player.room_id);
            players[player.token].nick=player.nick;
            socket.emit(socket_message.enter_room.connect);
        }
    });

    socket.on(socket_message.init_player, (canvas)=>{
        let token=create_token();
        players[token]=new Player(canvas);
        socket.emit(socket_message.init_player, token);
        clearInterval(get_interval);
        get_interval=setInterval(info_to_player,interval_time,socket,token);
    });

    socket.on(socket_message.button.up, (token)=>{
        if(players[token]===undefined)return;
        players[token].velocity.y=-1*up_delta*delta_time;
    });

    socket.on(socket_message.button.left, (token)=>{
        if(players[token]===undefined)return;
        players[token].forces.side.x=Math.max(players[token].forces.side.x-side_delta,-3*block_size*delta_time);
        players[token].side_force=true;
        players[token].direction='left';
        clearTimeout(side_force_timeout);
        side_force_timeout=setTimeout(()=>{players[token].side_force=false},5*interval_time);
    });

    socket.on(socket_message.button.right, (token)=>{
        if(players[token]===undefined)return;
        players[token].forces.side.x=Math.min(players[token].forces.side.x+side_delta,3*block_size*delta_time);
        players[token].side_force=true;
        players[token].direction='right';
        clearTimeout(side_force_timeout);
        side_force_timeout=setTimeout(()=>{players[token].side_force=false},5*interval_time);
    });

    socket.on(socket_message.button.hit, (token)=>{
        if(players[token]===undefined)return;
        if(players[token].can_hit&&players[token].health>0){
            players[token].can_hit=false;
            players[token].success=false;
            setTimeout(()=>players[token].can_hit=true,hit_delta);
            let hit_interval=setInterval(hit,interval_time,token);
            setTimeout(()=>{clearInterval(hit_interval)},interval_time*6);
        }
    });
});

setInterval(physics,interval_time);