import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
import { Window } from 'happy-dom';
import { featureOptionCategories, featureOptions } from '../../src/options.ts';

registerHooks({resolve(specifier,context,next){
  if(specifier==='homebridge-plugin-utils/featureOptions.js')return {url:new URL('../../node_modules/homebridge-plugin-utils/dist/ui/featureOptions.js',import.meta.url).href,shortCircuit:true};
  return next(specifier,context);
}});
let revision = 0;
async function page(projectors, options = []) {
  const window = new Window({url:'http://localhost/'});
  window.document.body.innerHTML='<main id="controlApp"></main>';
  Object.defineProperty(globalThis,'document',{value:window.document,configurable:true});
  Object.defineProperty(globalThis,'navigator',{value:window.navigator,configurable:true});
  globalThis.window=window;
  globalThis.localStorage=window.localStorage;
  window.confirm=()=>{throw Error('Browser modals are blocked by Homebridge');};
  const state={saved:undefined,staged:undefined,errors:[]};
  globalThis.homebridge={hideSchemaForm(){},fixScrollHeight(){},hideSpinner(){},enableSaveButton(){},disableSaveButton(){},
    i18nCurrentLang:async()=> 'zh-CN',getPluginConfig:async()=>[{platform:'SonyProjectorUnified',projectors,options}],
    request:async()=>({categories:featureOptionCategories,options:featureOptions}),
    updatePluginConfig:async(config)=>{state.staged=structuredClone(config);},
    savePluginConfig:async()=>{state.saved=structuredClone(state.staged);},
    toast:{success(){},error(message){state.errors.push(message);}}};
  await import('../public/ui.mjs?test='+revision++);
  const flush=async()=>{await new Promise(resolve=>setImmediate(resolve));};
  return {document:window.document,state,flush,async close(){globalThis.sonyControlEpoch.abort();await window.happyDOM.close();}};
}
test('invalid added profile can be located, removed without modals, and valid configuration saved',async()=>{
  const p=await page([{host:'pj.example',id:'pj',name:'Cinema'},{host:'',id:'empty',name:'Empty'}]);
  try {
    const save=p.document.querySelector('#saveSettings');assert.equal(save.disabled,false);
    save.click();assert.equal(p.document.querySelector('#projectorSelect').value,'1');assert.ok(p.state.errors[0].includes('补全'));
    p.document.querySelector('.spj-removal button').click();
    assert.equal(p.document.querySelectorAll('.spj-removal button').length,2);
    p.document.querySelector('.spj-removal button').click();await p.flush();
    assert.equal(p.document.querySelector('#projectorSelect').options.length,1);
    p.document.querySelector('#saveSettings').click();await p.flush();
    assert.equal(p.state.saved[0].projectors.length,1);assert.equal(p.state.saved[0].projectors[0].host,'pj.example');
  } finally {await p.close();}
});
test('removing the last projector persists an empty list, and reopening does not create a ghost profile',async()=>{
  let p=await page([{host:'pj.example'}]);
  p.document.querySelector('.spj-removal button').click();p.document.querySelector('.spj-removal button').click();await p.flush();
  p.document.querySelector('#saveSettings').click();await p.flush();assert.deepEqual(p.state.saved[0].projectors,[]);await p.close();
  p=await page([]);try {assert.equal(p.document.querySelector('#setting-host'),null);assert.equal(p.document.querySelector('#saveSettings').disabled,false);}finally{await p.close();}
});
test('host language selects Chinese, feature groups fold and disabled remote hides dependent choices',async()=>{
  const p=await page([{host:'pj.example'}],['Disable.Remote']);
  try {
    assert.equal(p.document.documentElement.lang,'zh-CN');
    p.document.querySelector('#menu-features').click();
    const groups=[...p.document.querySelectorAll('.spj-feature-group')];assert.ok(groups.length>4);assert.ok(groups.every(g=>!g.open));
    assert.ok(p.document.querySelector('#option-Remote'));assert.equal(p.document.querySelector('[id="option-Remote.Back"]'),null);
    const remote=p.document.querySelector('#option-Remote');remote.value='enabled';remote.dispatchEvent(new window.Event('change'));await p.flush();
    assert.ok(p.document.querySelector('[id="option-Remote.Back"]'));
    p.document.querySelector('#menu-help').click();assert.ok(p.document.querySelector('a[href*="Troubleshooting.zh-CN.md"]'));
  } finally {await p.close();}
});
