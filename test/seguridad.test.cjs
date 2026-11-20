const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const base = path.resolve(__dirname,'..');
const root = base;
const dependencies = createRequire(path.join(root,'package.json'));
let checks = 0;
function load(relative, env, overrides = {}) {
  const exports = {};
  const context = {
    module: { exports }, exports, Buffer, console: { log(){}, warn(){}, error(){} },
    process: { env: { ...env } },
    __dirname: path.dirname(path.join(root,relative)),
    require(name) {
      if (Object.prototype.hasOwnProperty.call(overrides,name)) return overrides[name];
      if (name === 'fs') return { existsSync:()=>true, appendFileSync(){},mkdirSync(){} };
      return dependencies(name);
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(root,relative),'utf8'),context,{filename:relative});
  return context.module.exports;
}
function getSecurity(env={}) {
  let options;
  const security = load('src/security/security.js',env,{
    'express-session': config => { options = config; return function sessionStub(){}; }
  });
  return { security, options:()=>options };
}
const app = () => ({set(){},use(){}});
for(const secret of [undefined,'short','CONFIGURAR_LOCALMENTE_CONFIGURAR_LOCALMENTE']) {
  assert.throws(()=>getSecurity({SESSION_SECRET:secret}).security.configureSecurity(app(),{port:3000,isProduction:true}));checks++;
}
const fixtureSecret = 'fixture-'.repeat(6);
const secure=getSecurity({SESSION_SECRET:fixtureSecret});
secure.security.configureSecurity(app(),{port:3000,isProduction:true});
assert.equal(secure.options().secret,fixtureSecret);
assert.equal(secure.options().cookie.secure,true);
assert.equal(secure.options().cookie.httpOnly,true);checks+=3;

async function main(){
  for(const [comment,expected] of [['<img src=x onerror=alert(1)>Texto',400],['Comentario permitido',null]]) {
    const req={body:{comentario:comment},originalUrl:'/api/comments'};
    let status=null,passed=false;
    const res={status(n){status=n;return this;},json(){return this;}};
    for(const middleware of secure.security.validateComment){
      if(middleware.run)await middleware.run(req);else middleware(req,res,()=>{passed=true;});
    }
    assert.equal(status,expected);assert.equal(passed,expected===null);checks+=2;
  }
  let inserted;
  const db={from(){return {insert(data){inserted=data;return this;},select(){return this;},async single(){return {data:{id:'test-id',comentario:inserted.comentario,created_at:'2026-01-01'},error:null};}};}};
  const controller=load('src/controllers/comments.controller.js',{}, {
    '../config/supabaseClient':db,
    '../security/security':secure.security
  });
  let responseCode;
  await controller.createComment({body:{comentario:'<b>Texto permitido</b>'},session:{user:{id:'test-user',nombre:'Demo'}}},
    {status(n){responseCode=n;return this;},json(){return this;}},e=>{throw e;});
  assert.equal(inserted.comentario,'Texto permitido');assert.equal(responseCode,201);checks+=2;

  const mockClient={createClient(...args){return {args};}};
  for(const env of [{},{SUPABASE_URL:'https://example.invalid',SUPABASE_ANON_KEY:'fixture-anon'}]){
    assert.throws(()=>load('src/config/supabaseClient.js',env,{'@supabase/supabase-js':mockClient}));checks++;
  }
  const client=load('src/config/supabaseClient.js',{SUPABASE_URL:'https://example.invalid',SUPABASE_SECRET_KEY:'sb_secret_'+'fixture'.repeat(8)},{'@supabase/supabase-js':mockClient});
  assert.equal(client.args[2].auth.persistSession,false);checks++;

  function element(){return {children:[],textContent:'',className:'',value:'',addEventListener(){},reset(){},append(...xs){this.children.push(...xs);},replaceChildren(...xs){this.children=xs;}};}
  let htmlAssignments=0;
  const document={getElementById(){return element();},createElement(){const x=element();Object.defineProperty(x,'innerHTML',{set(){htmlAssignments++;}});return x;}};
  const ui=vm.createContext({document,window:{location:{}},Intl,Date,fetch:async()=>({ok:true,json:async()=>({user:{nombre:'Demo'},comments:[]})})});
  vm.runInContext(fs.readFileSync(path.join(root,'public/js/comments.js'),'utf8'),ui);
  const node=vm.runInContext('createCommentNode({usuario:{nombre:"Demo"},created_at:"2026-01-01",comentario:"<img src=x onerror=alert(1)>"})',ui);
  assert.equal(htmlAssignments,0);assert.equal(node.children[1].textContent,'<img src=x onerror=alert(1)>');checks+=2;
  await new Promise(resolve=>setImmediate(resolve));
  console.log('Node: '+checks+' comprobaciones de seguridad superadas, sin llamadas a servicios reales.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
