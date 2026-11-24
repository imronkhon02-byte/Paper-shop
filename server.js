
const http=require('http'),fs=require('fs'),path=require('path');
const PORT=process.env.PORT||3000, ADMIN_PASSWORD=process.env.ADMIN_PASSWORD;
const admins={creator:{name:'Умидхонов Имрон',password:ADMIN_PASSWORD},sasha:{name:'Умаров Саша',password:process.env.SASHA_PASSWORD},bakhtier:{name:'Исабаев Бахтиер',password:process.env.BAKHTIER_PASSWORD},donier:{name:'Заиров Дониер',password:process.env.DONIER_PASSWORD}};
const dbfile=path.join(__dirname,'data.json');
const defaults={extra:[],accessories:[],discs:[],orders:[],repairs:[],ratings:{},notes:[],seen:0};
function load(){try{return {...defaults,...JSON.parse(fs.readFileSync(dbfile,'utf8'))}}catch{return {...defaults}}}
function save(d){fs.writeFileSync(dbfile,JSON.stringify(d,null,2))}
function send(res,status,obj){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*'});res.end(JSON.stringify(obj))}
function roleFor(p){if(!p)return null;for(const [r,a] of Object.entries(admins))if(a.password&&p===a.password)return r;return null}
function safeData(d){return {extra:d.extra,accessories:d.accessories,discs:d.discs}}
const server=http.createServer((req,res)=>{
if(req.method==='OPTIONS'){res.writeHead(204);return res.end()}
if(req.url==='/'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return res.end(fs.readFileSync(path.join(__dirname,'index.html')))}
let body='';req.on('data',c=>{body+=c;if(body.length>1e6)req.destroy()});req.on('end',()=>{
let x={};try{x=body?JSON.parse(body):{}}catch{return send(res,400,{error:'Некорректный JSON'})}
let d=load(),today=new Date().toISOString().slice(0,10),name=(x.name||'').trim().replace(/\s+/g,' ');
if(req.url==='/api/data'&&req.method==='GET')return send(res,200,safeData(d));
if(req.url==='/api/login'&&req.method==='POST'){if(!name||name.length>40||name.split(' ').length<2)return send(res,400,{error:'Введите имя и фамилию'});if(name.toLowerCase()==='умидхонов имрон')return send(res,403,{error:'Это имя зарезервировано'});return send(res,200,{ok:true})}
if(req.url==='/api/buy'&&req.method==='POST'){let items=x.items||[];if(!name||name.split(' ').length<2||!items.length||items.length>5)return send(res,400,{error:'Проверьте имя и товары (максимум 5)'});let count=d.orders.filter(o=>o.buyer.toLowerCase()===name.toLowerCase()&&o.day===today).reduce((a,o)=>a+o.items.length,0);if(count+items.length>5)return send(res,403,{error:'Дневной лимит: 5 товаров'});d.orders.push({buyer:name,day:today,items,t:Date.now()});d.notes.push({buyer:name,items,t:Date.now()});save(d);return send(res,200,{ok:true})}
if(req.url==='/api/repair'&&req.method==='POST'){let master=(x.master||'').trim(),desc=(x.description||'').trim(),allowed=Object.values(admins).map(a=>a.name);if(!name||name.split(' ').length<2||!allowed.includes(master)||desc.length<5||desc.length>1000)return send(res,400,{error:'Укажите имя, мастера и описание (5–1000 символов)'});d.repairs.push({id:String(Date.now())+Math.random().toString(36).slice(2,7),buyer:name,master,description:desc,status:'Новое',t:Date.now()});save(d);return send(res,200,{ok:true})}
if(req.url==='/api/admin'&&req.method==='POST'){let role=roleFor(x.password);if(!role)return send(res,403,{error:'Пароль администратора неверный'});let action=x.action;
if(action==='check')return send(res,200,{ok:true,role});

if(action==='orderList'){
return send(res,200,{orders:d.notes.slice().reverse()})
}


if(action==='repairList'){let own=admins[role].name;return send(res,200,{repairs:d.repairs.filter(a=>role==='creator'||a.master===own)})}
if(action==='repairStatus'){let item=d.repairs.find(a=>a.id===x.id);if(!item||!(role==='creator'||item.master===admins[role].name))return send(res,403,{error:'Нет доступа'});if(!['Новое','В работе','Завершено'].includes(x.status))return send(res,400,{error:'Неверный статус'});item.status=x.status;save(d);return send(res,200,{ok:true})}
if(action==='setRating'){if(role!=='creator')return send(res,403,{error:'Оценки изменяет только создатель'});let m=(x.master||'').trim(),rating=String(x.rating||'').trim(),desc=(x.description||'').trim();if(!Object.values(admins).some(a=>a.name===m)||!rating||rating.length>30||desc.length>500)return send(res,400,{error:'Проверьте оценку и описание'});d.ratings[m]={rating,description:desc};save(d);return send(res,200,{ok:true})}
if(['publish','publishAccessory','publishDisc'].includes(action)){let v=(x.name||'').trim(),details=(x.details||'').trim(),target=action==='publish'?d.extra:action==='publishAccessory'?d.accessories:d.discs;if(!v||v.length>60||details.length>500||target.some(a=>a.name.toLowerCase()===v.toLowerCase()))return send(res,400,{error:'Название пустое, слишком длинное или уже существует'});target.push({id:String(Date.now())+Math.random().toString(36).slice(2,6),name:v,details});save(d);return send(res,200,{ok:true})}
if(action==='delete'){if(role!=='creator')return send(res,403,{error:'Удалять товары может только создатель'});let found=false;for(const k of ['extra','accessories','discs']){let old=d[k].length;d[k]=d[k].filter(a=>a.id!==x.id);found=found||old!==d[k].length}if(!found)return send(res,404,{error:'Товар не найден'});save(d);return send(res,200,{ok:true})}
return send(res,400,{error:'Неизвестная команда'})}
return send(res,404,{error:'Не найдено'});
});});server.listen(PORT,()=>console.log('Paper shop listening on '+PORT));
