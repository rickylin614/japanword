// 無外部依賴的本機靜態伺服器。手機測試可設定 HOST=0.0.0.0。
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.csv':'text/csv; charset=utf-8'};
const host=process.env.HOST || '127.0.0.1';
const port=Number(process.env.PORT || 8000);
const server=http.createServer((req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
  let pathname;
  try {pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);} catch {res.writeHead(400).end();return;}
  const file=path.resolve(__dirname,'.'+(pathname==='/'?'/layout.html':pathname));
  if(!file.startsWith(__dirname+path.sep)||!types[path.extname(file)]){res.writeHead(404).end();return;}
  fs.readFile(file,(error,data)=>{
    if(error){res.writeHead(404).end('Not found');return;}
    res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    res.end(req.method==='HEAD'?undefined:data);
  });
});
server.on('error',error=>{console.error(error.message);process.exitCode=1;});
server.listen(port,host,()=>console.log(`日語練習室：http://${host}:${port}/layout.html`));
