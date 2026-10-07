export class HttpError extends Error {
  constructor(message,status=400){super(message);this.status=status;}
}
export function checkRoute(request){
  const path=new URL(request.url).pathname;
  const routes={
    '/api/auth/me':['GET'],
    ...Object.fromEntries(['register','login','resend','verify','forgot','reset','logout','change-password'].map(p=>['/api/auth/'+p,['POST']])),
    '/api/schools':['GET','POST'],'/api/state':['GET','POST'],
    '/api/ballot':['POST'],'/api/vote':['POST'],'/api/candidate-photo':['GET','POST']
  };
  if(!routes[path])throw new HttpError('Caminho não encontrado.',404);
  if(!routes[path].includes(request.method))throw new HttpError('Método não permitido.',405);
}
export async function readBody(request){
  if(request.method!=='POST')return {};
  const limit=new URL(request.url).pathname==='/api/state'?131072:32768;
  const length=request.headers.get('Content-Length');
  if(length&&(!/^\d+$/.test(length)||Number(length)>limit))throw new HttpError('Requisição muito grande.',413);
  const reader=request.body?.getReader();let size=0,parts=[];
  if(reader){try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new HttpError('Requisição muito grande.',413);}parts.push(value);}}finally{reader.releaseLock();}}
  const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}
  let body;try{body=size?JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)):{};}catch{throw new HttpError('JSON inválido.');}
  if(!body||Array.isArray(body)||typeof body!=='object')throw new HttpError('Envie um objeto JSON.');
  const fields={name:120,schoolName:120,city:80,inep:20,email:254,password:128,currentPassword:128,token:64,school:80,classId:80,candidateId:80,code:32,type:32,key:100,reason:1000};
  for(const [key,max] of Object.entries(fields))if(body[key]!==undefined&&(typeof body[key]!=='string'||body[key].length>max))throw new HttpError('Campo inválido: '+key+'.');
  if(body.students!==undefined&&!((typeof body.students==='number'&&Number.isInteger(body.students))||(typeof body.students==='string'&&/^\d{1,4}$/.test(body.students))))throw new HttpError('Quantidade de estudantes inválida.');
  if(body.category!==undefined&&!((typeof body.category==='number'&&Number.isInteger(body.category)&&body.category>=0&&body.category<=4)||(typeof body.category==='string'&&/^[0-4]$/.test(body.category))))throw new HttpError('Categoria inválida.');
  if(body.concluding!==undefined&&typeof body.concluding!=='boolean')throw new HttpError('Informe se a turma é concluinte.');
  if(body.photo!==undefined&&(typeof body.photo!=='string'||body.photo.length>87500))throw new HttpError('Foto inválida.');
  if(body.choices!==undefined&&(!body.choices||Array.isArray(body.choices)||typeof body.choices!=='object'||Object.keys(body.choices).length>5||Object.entries(body.choices).some(([key,value])=>!/[0-4]/.test(key)||key.length!==1||typeof value!=='string'||value.length>80)))throw new HttpError('Escolhas inválidas.');
  return body;
}
export function securityHeaders(url){
  return {
    'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
    'Permissions-Policy':'camera=(self), microphone=(), geolocation=(), payment=()',
    'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'self' https://chatgpt.com https://*.chatgpt.com",
    ...(new URL(url).protocol==='https:'?{'Strict-Transport-Security':'max-age=31536000'}:{})
  };
}
export function secureResponse(response,url){
  const headers=new Headers(response.headers);
  for(const [key,value] of Object.entries(securityHeaders(url)))headers.set(key,value);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

const maintenance=new WeakMap();
export async function cleanExpired(db){
  const timestamp=Math.floor(Date.now()/1000);
  if(timestamp-(maintenance.get(db)||0)<300)return;
  await db.batch([
    db.prepare('DELETE FROM sessions WHERE expires_at<=?').bind(timestamp),
    db.prepare('DELETE FROM rate_limits WHERE expires_at<=?').bind(timestamp)
  ]);
  maintenance.set(db,timestamp);
}
