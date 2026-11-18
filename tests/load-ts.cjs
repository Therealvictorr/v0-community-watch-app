const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
module.exports=function load(file,mocks={}){
 const filename=path.resolve(__dirname,'..',file),source=fs.readFileSync(filename,'utf8');
 const result=ts.transpileModule(source,{fileName:filename,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}});
 const exports={};const customRequire=name=>{if(name in mocks)return mocks[name];if(name.startsWith('.'))return module.exports(path.relative(path.resolve(__dirname,'..'),path.resolve(path.dirname(filename),name+'.ts')),mocks);return require(name)};
 vm.runInNewContext(result.outputText,{exports,require:customRequire,Response,URL,AbortSignal,console,process,Date,setTimeout,clearTimeout},{filename});return exports;
};