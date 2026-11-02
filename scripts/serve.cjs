const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {PUBLIC_DIR}=require('./lib/paths.cjs');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.csv':'text/csv; charset=utf-8','.wav':'audio/wav','.mp3':'audio/mpeg','.ico':'image/x-icon','.png':'image/png'};
const host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT||8000);
const server=http.createServer((req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
  const file=path.resolve(PUBLIC_DIR,'.'+(pathname==='/'?'/layout.html':pathname));
  if(!file.startsWith(PUBLIC_DIR+path.sep)||!types[path.extname(file)]){res.writeHead(404).end();return;}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);});
});
server.on('error',e=>{console.error(e.message);process.exitCode=1;});server.listen(port,host,()=>console.log(`日語練習室：http://${host}:${port}/layout.html`));
