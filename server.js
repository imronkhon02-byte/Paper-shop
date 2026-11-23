const http=require('http'),fs=require('fs'),path=require('path');
const PORT=process.env.PORT||3000, ADMIN_PASSWORD=process.env.ADMIN_PASSWORD||'change-this-password';
const dbfile=path.join(__dirname,'data.json');
function load(){try{return JSON.parse(fs.readFileSync(dbfile))}catch{return {extra:[],orders:[],notes:[],seen:0}}}
function save(d){fs.writeFileSync(dbfile,JSON.stringify(d,null,2))}
function send(res,status,obj){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*'});res.end(JSON.stringify(obj))}
const server=http.createServer((req,res)=>{if(req.method==='OPTIONS'){res.writeHead(204);return res.end()}
if(req.url==='/'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return res.end(fs.readFileSync(path.join(__dirname,'index.html')))}
let body='';req.on('data',c=>body+=c);req.on('end',()=>{let x={};try{x=body?JSON.parse(body):{}}catch{return send(res,400,{error:'bad json'})}let d=load(),today=new Date().toISOString().slice(0,10),name=(x.name||'').trim().replace(/\s+/g,' '),admin=x.admin===true&&x.password===ADMIN_PASSWORD;
if(req.url==='/api/data'&&req.method==='GET')return send(res,200,{extra:d.extra,notes:d.notes,seen:d.seen});
if(req.url==='/api/login'&&req.method==='POST'){if(!name||name.length>40||name.split(' ').length<2)return send(res,400,{error:'Введите имя и фамилию'});if(name.toLowerCase()==='умидхонов имрон'&&!admin)return send(res,403,{error:'Это имя создателя'});return send(res,200,{ok:true,admin})}
if(req.url==='/api/buy'&&req.method==='POST'){let n=name;let items=x.items||[];if(!n||n.split(' ').length<2||!items.length||items.length>2)return send(res,400,{error:'Проверьте имя/покупку'});let count=d.orders.filter(o=>o.buyer.toLowerCase()===n.toLowerCase()&&o.day===today).reduce((a,o)=>a+o.items.length,0);if(count+items.length>2)return send(res,403,{error:'Дневной лимит: 2 товара'});d.orders.push({buyer:n,day:today,items,t:Date.now()});d.notes.push({buyer:n,items,t:Date.now()});save(d);return send(res,200,{ok:true})}
if(req.url==='/api/admin'&&req.method==='POST'){if(x.password!==ADMIN_PASSWORD)return send(res,403,{error:'Пароль неверный'});if(x.action==='check')return send(res,200,{ok:true});if(x.action==='publish'){let v=(x.name||'').trim();if(!v||v.length>30||d.extra.some(a=>a.name.toLowerCase()===v.toLowerCase()))return send(res,400,{error:'Название пустое или уже существует'});d.extra.push({id:String(Date.now()),name:v});}else if(x.action==='delete')d.extra=d.extra.filter(a=>a.id!==x.id);else if(x.action==='seen')d.seen=Date.now();save(d);return send(res,200,{ok:true,extra:d.extra,notes:d.notes,seen:d.seen})}
send(res,404,{error:'not found'})});});
server.listen(PORT,()=>console.log('Paper shop listening on '+PORT));
