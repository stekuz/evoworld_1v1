const socket_message={
    ping:9,
    score:10,
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
        height:130,
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
let ping=0;


canvas.width=window.screen.width*1.5;
canvas.height=window.screen.height*1.5;
canvas.style=`width:${window.screen.width}px;height:${window.screen.height}px;margin-left:0px;margin-top:0px;`;
ctx.font='30px serif';
const fontsize=30;

function room_connection_init(type){
    if(type==='random'||type==='create'){
        me.nick=document.getElementById('name_input').value;
        socket.emit(socket_message.init_room,{token:me.token,nick:me.nick},type);
    }
    if(type==='connect'){
        me.nick=document.getElementById('name_input').value;
        socket.emit(socket_message.init_room,{token:me.token,nick:me.nick,room_id:document.getElementById('room_id_in').value},type);
    }
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
        if(player.direction==='right'){
            ctx.fillStyle='#000000';//black
            ctx.drawImage(game_objects[player.name].image[player.direction],
                canvas.width/2+player.position.x-me.position.x-game_objects[player.name].width,
                canvas.height/2+player.position.y-me.position.y-game_objects[player.name].height,
                game_objects[player.name].width,game_objects[player.name].height);
            
            ctx.fillRect(canvas.width/2+player.position.x-me.position.x-game_objects[player.name].width,
                canvas.height/2+player.position.y-me.position.y-game_objects[player.name].height-2*fontsize,
                game_objects.health_bar.border.width,
                game_objects.health_bar.border.height);
            
            ctx.fillStyle='#37ff00';//green
            ctx.fillRect(canvas.width/2+player.position.x-me.position.x-game_objects[player.name].width+(game_objects.health_bar.border.width-game_objects.health_bar.bar.width)/2,
                canvas.height/2+player.position.y-me.position.y-game_objects[player.name].height-2*fontsize+(game_objects.health_bar.border.height-game_objects.health_bar.bar.height)/2,
                Math.max(0,game_objects.health_bar.bar.width*player.health/100),
                game_objects.health_bar.bar.height);
        }else{
            ctx.fillStyle='#000000';//black
            ctx.drawImage(game_objects[player.name].image[player.direction],
                canvas.width/2+player.position.x-me.position.x-game_objects[player.name].width-game_objects.scythe.width,
                canvas.height/2+player.position.y-me.position.y-game_objects[player.name].height,
                game_objects[player.name].width,game_objects[player.name].height);
            
            ctx.fillRect(canvas.width/2+player.position.x-me.position.x-game_objects[player.name].width,
                canvas.height/2+player.position.y-me.position.y-game_objects[player.name].height-2*fontsize,
                game_objects.health_bar.border.width,
                game_objects.health_bar.border.height);
            
            ctx.fillStyle='#37ff00';//green
            ctx.fillRect(canvas.width/2+player.position.x-me.position.x-game_objects[player.name].width+(game_objects.health_bar.border.width-game_objects.health_bar.bar.width)/2,
                canvas.height/2+player.position.y-me.position.y-game_objects[player.name].height-2*fontsize+(game_objects.health_bar.border.height-game_objects.health_bar.bar.height)/2,
                Math.max(0,game_objects.health_bar.bar.width*player.health/100),
                game_objects.health_bar.bar.height);
        }
            
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
            Math.max(0,game_objects.health_bar.bar.width*me.health/100),
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
            Math.max(0,game_objects.health_bar.bar.width*me.health/100),
            game_objects.health_bar.bar.height);
    }
    
    ctx.fillStyle='#000000';//black
    ctx.fillText(me.nick,canvas.width/2-2.2*game_objects.scythe.width-fontsize/3*Math.floor(me.nick.length/2),canvas.height/2-me.height);
}

function start_game(){
    document.getElementById('pre_game').style.zIndex=-1;
    document.getElementById('scores1').style.zIndex=2;
    document.getElementById('scores2').style.zIndex=2;
    setInterval(draw,20);
}

socket.emit(socket_message.init_player,{width:canvas.width,height:canvas.height});
socket.on(socket_message.init_player,token=>{me.token=token});

socket.on(socket_message.enter_room.connect,()=>start_game());
socket.on(socket_message.enter_room.create,room_id=>{
    start_game();
    document.getElementById('room_id_out').style.zIndex=1;
    document.getElementById('room_id_out').innerHTML='room id: '+room_id;
});
socket.on(socket_message.enter_room.random,()=>start_game());

socket.on(socket_message.score,scores=>{
    document.getElementById('scores1').innerHTML=scores[0].nick+':   '+scores[0].score;
    document.getElementById('scores2').innerHTML=scores[1].nick+':   '+scores[1].score;
});
socket.on(socket_message.get_info,player=>{if(player!==undefined){
    me.position=player.position;
    me.health=player.health;
    me.nick=player.nick;
}});

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

//ping

socket.on(socket_message.ping,server_time=>{
    ping=Date.now()-server_time;
    document.getElementById('ping').innerHTML=ping+' ms';
});
setInterval(()=>socket.emit(socket_message.ping),1000);