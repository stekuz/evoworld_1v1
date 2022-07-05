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
const socket=io();
const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
let me={
    name:'reaper',
    health:100,
    width:100,
    height:100,
    direction:'right',
};
const game_objects={
    health_bar:{
        border:{
            width:65,
            height:30,
        },
        bar:{
            width:61,
            height:26,
        },
    },
    scythe:{
        width:35,
        height:110,
    },
    wall:{
        width:50,
        height:50,
        image:image.wall,
    },
    reaper:{
        width:100,
        height:100,
        image:{
            left:image.reaper.left,
            right:image.reaper.right,
        },
    },
};
const key_pressed={
    ArrowUp:0,
    ArrowLeft:0,
    ArrowRight:0,
    KeyW:0,
    KeyA:0,
    KeyD:0,
    Space:0,
};
let map_to_draw=[],players_to_draw=[];

canvas.width=window.screen.width*1.5;
canvas.height=window.screen.height*1.5;
canvas.style=`width:${window.screen.width}px;height:${window.screen.height}px;margin-left:0px;margin-top:0px;`;
ctx.font='30px serif';
const fontsize=30;

function room_connection_init(){
    me.nick=document.getElementById('name_input').value;
    socket.emit(socket_message.init_room,{token:me.token,nick:me.nick});
}

function draw(){
    ctx.fillStyle='#44c3e7';//blue for bg
    ctx.fillRect(0,0,canvas.width,canvas.height);
    
    map_to_draw.forEach(object=>{
        if(object===undefined)return;
        ctx.drawImage(game_objects[object.name].image,
            canvas.width/2+object.position.x-me.position.x,canvas.height/2+object.position.y-me.position.y,
            game_objects[object.name].width,game_objects[object.name].height);
    });

    players_to_draw.forEach(player=>{
        if(player===undefined)return;
        if(player.direction==='right') ctx.drawImage(game_objects[player.name].image[player.direction],
            canvas.width/2+player.position.x-me.position.x-game_objects[player.name].width,canvas.height/2+player.position.y-me.position.y-game_objects[player.name].height,
            game_objects[player.name].width,game_objects[player.name].height);
        else ctx.drawImage(game_objects[player.name].image[player.direction],
            canvas.width/2+player.position.x-me.position.x-game_objects[player.name].width-game_objects.scythe.width,canvas.height/2+player.position.y-me.position.y-game_objects[player.name].height,
            game_objects[player.name].width,game_objects[player.name].height);
            
        ctx.fillStyle='#000000';//black
        ctx.fillText(player.nick,canvas.width/2+player.position.x-me.position.x-game_objects[player.name].width+1*game_objects.scythe.width-fontsize/3*Math.floor(player.nick.length/2),canvas.height/2+player.position.y-me.position.y-game_objects[player.name].height);
    });

    if(me.direction==='right'){
        ctx.fillStyle='#000000';//black
        ctx.drawImage(game_objects[me.name].image[me.direction],
            canvas.width/2-me.width,
            canvas.height/2-me.height,
            me.width,
            me.height);
        ctx.fillRect(canvas.width/2-me.width,
            canvas.height/2-me.height-2*fontsize,
            game_objects.health_bar.border.width,
            game_objects.health_bar.border.height);
        
        ctx.fillStyle='#37ff00';//green
        ctx.fillRect(canvas.width/2-me.width+(game_objects.health_bar.border.width-game_objects.health_bar.bar.width)/2,
            canvas.height/2-me.height-2*fontsize+(game_objects.health_bar.border.height-game_objects.health_bar.bar.height)/2,
            game_objects.health_bar.bar.width,
            game_objects.health_bar.bar.height);
    }else{
        ctx.fillStyle='#000000';//black
        ctx.drawImage(game_objects[me.name].image[me.direction],
            canvas.width/2-me.width-game_objects.scythe.width,
            canvas.height/2-me.height,
            me.width,
            me.height);
        ctx.fillRect(canvas.width/2-me.width,
            canvas.height/2-me.height-2*fontsize,
            game_objects.health_bar.border.width,
            game_objects.health_bar.border.height);
        
        ctx.fillStyle='#37ff00';//green
        ctx.fillRect(canvas.width/2-me.width+(game_objects.health_bar.border.width-game_objects.health_bar.bar.width)/2,
            canvas.height/2-me.height-2*fontsize+(game_objects.health_bar.border.height-game_objects.health_bar.bar.height)/2,
            game_objects.health_bar.bar.width,
            game_objects.health_bar.bar.height);
    }
    
    ctx.fillStyle='#000000';//black
    ctx.fillText(me.nick,canvas.width/2-2.2*game_objects.scythe.width-fontsize/3*Math.floor(me.nick.length/2),canvas.height/2-me.height);
}

function start_game(){
    document.getElementById('pre_game').style.zIndex=-1;
    setInterval(draw,20);
}

/*

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

me.token=create_token();
*/

socket.emit(socket_message.init_player,{width:canvas.width,height:canvas.height});

socket.on(socket_message.init_player,token=>me.token=token);

socket.on(socket_message.enter_room,room=>start_game());

socket.on(socket_message.get_info,player=>{if(player!==undefined){me=player;me.width=100;}});

socket.on(socket_message.map_to_draw,map=>map_to_draw=map);

socket.on(socket_message.players_to_draw,players=>players_to_draw=players);

//keyboard/mouse events

document.addEventListener('keydown',(key)=>{key_pressed[key.code]=1});
document.addEventListener('keyup',(key)=>{key_pressed[key.code]=0});
setInterval(()=>{
    if(key_pressed.KeyW||key_pressed.ArrowUp)socket.emit(socket_message.button.up,me.token);
    if(key_pressed.KeyA||key_pressed.ArrowLeft){
        socket.emit(socket_message.button.left,me.token);
        me.direction='left';
    }
    if(key_pressed.KeyD||key_pressed.ArrowRight){
        socket.emit(socket_message.button.right,me.token);
        me.direction='right';
    }
    if(key_pressed.Space)socket.emit(socket_message.button.hit,me.token);
},50);