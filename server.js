const http=require('http'),fs=require('fs'),path=require('path');
const {WebSocketServer}=require('ws');
const page=fs.readFileSync(path.join(__dirname,'public','index.html'));
const server=http.createServer((req,res)=>{
  if(req.url==='/health'){res.end('ok');return}
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(page);
});
const wss=new WebSocketServer({server,maxPayload:16*1024});
const rooms=new Map();
wss.on('connection',ws=>{
  let room=null;
  ws.isAlive=true;ws.on('pong',()=>{ws.isAlive=true});
  ws.on('message',raw=>{
    let m;try{m=JSON.parse(raw)}catch{return}
    if(m.j&&!room){
      const id=String(m.j).slice(0,8);
      if(!rooms.has(id))rooms.set(id,new Set());
      room=id;rooms.get(id).add(ws);
      send(id,ws,{t:'__joined'});return;
    }
    if(room&&typeof m.t==='string')send(room,ws,{t:m.t,d:m.d});
  });
  ws.on('close',()=>{if(room&&rooms.has(room)){rooms.get(room).delete(ws);if(!rooms.get(room).size)rooms.delete(room)}});
});
function send(id,from,msg){const s=JSON.stringify(msg);for(const c of rooms.get(id)||[])if(c!==from&&c.readyState===1)c.send(s)}
setInterval(()=>{wss.clients.forEach(c=>{if(!c.isAlive)return c.terminate();c.isAlive=false;c.ping()})},30000);
server.listen(process.env.PORT||3000,()=>console.log('listening'));
