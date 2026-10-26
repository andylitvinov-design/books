// Executes the real chooser and phone-country controls against synthetic route
// and VM popup boundaries. This is not native DOM/browser geometry evidence.
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {environment, mount, turn, readContactSource} from './contact-component-fixture.mjs';
import {createCompactAlchemyRegistrationProfile} from '../../scripts/helpers/contact-channel-verifier.mjs';

export function compactContactBrowserFixture({locale='en', mutateSource, attack, uiFailure, cleanupFailure, routeFailure}={}) {
  const path = '/' + locale + '/services/alchemy-of-soul';
  const env = environment(locale, {pathname:path});
  const profile = createCompactAlchemyRegistrationProfile(env.window.location.href);
  const draft = new URL(profile.whatsappUrl);
  draft.searchParams.set('text', draft.searchParams.get('text').replace(/\n\n(?:Enquiry|Заявка|Solicitud): HH-[A-F0-9]{12}$/, ''));
  const originalOpen=env.window.open, routes=[], calls=[], contextReads=[], aborted=[], fulfilled=[], errors=[];
  let removed=0, f;
  const dispatch = async (url, method, data) => {
    let response;
    const route={request:()=>({url:()=>url,method:()=>method,postDataJSON:()=>{if(data instanceof Error)throw data;return structuredClone(data);}}),
      async fallback(){calls.push('fallback'); if(['GET','HEAD'].includes(method)&&new URL(url).origin==='http://127.0.0.1:3100')contextReads.push(method);else aborted.push(method);},
      async continue(){calls.push('continue');throw Error('CONTEXT_GATE_BYPASSED');},
      async abort(){aborted.push(method);},
      async fulfill(value){if(routeFailure)throw Error('SYNTHETIC_ROUTE_FAILURE');fulfilled.push(method);response={ok:value.status<300,status:value.status,json:async()=>JSON.parse(value.body)};},
    };
    const selected=routes.at(-1); assert.ok(selected,'Missing fixture route');
    try {await selected.handler(route);} catch(error){errors.push(error);throw error;}
    return response || {ok:false,status:403,json:async()=>({saved:false})};
  };
  env.fetch=async(url, options)=>{
    const data=JSON.parse(options.body);env.requests.push(options.body);
    if(attack?.stage==='submit')return dispatch(attack.url,attack.method,attack.body?attack.body(data):data);
    return dispatch('http://127.0.0.1:3100'+url,options.method,data);
  };
  const source=readContactSource('components/contact-channel-chooser.tsx');
  f=mount('contact-channel-chooser','ContactChannelChooser',{locale,whatsappUrl:draft.href,compactPhone:true,compactTrigger:true,stayAfterSave:true,publicTopic:profile.description},env,{sourceOverride:mutateSource?mutateSource(source):source});
  const page={url:()=>env.window.location.href,
    async route(pattern,handler){routes.push({pattern,handler});},
    async unroute(pattern,handler){assert.equal(routes.length,1);assert.equal(routes[0].pattern,pattern);assert.equal(routes[0].handler,handler);routes.pop();removed++;if(cleanupFailure)throw Error('SYNTHETIC_CLEANUP_FAILURE');},
    async evaluate(fn,arg){const result=await runInNewContext('('+fn.toString()+')(arg)',{window:env.window,arg,URL,Object,Error});return result===undefined?undefined:structuredClone(result);},
  };
  function locator(selector){
    const selected=()=>f.nodes().map(node=>({...node,props:{...node.props,...node.props.attributes}})).filter(node=>{
      const props=node.props,type=node.type==='acquisition-link'?'a':node.type;
      if(selector==='form')return type==='form';
      if(selector==='[data-phone-country-input] select')return type==='select';
      if(selector==='[data-phone-country-input] input[type="tel"]')return type==='input'&&props.type==='tel';
      const tag=selector.match(/^([a-z]+)/)?.[1];if(tag&&type!==tag)return false;
      const clauses=[...selector.matchAll(/\[([\w-]+)(?:="([^"]+)")?\]/g)];
      assert.ok(clauses.length,selector);
      return clauses.every(([,name,value])=>Object.hasOwn(props,name)&&(value===undefined||String(props[name])===value));
    });
    const one=()=>{const nodes=selected();assert.equal(nodes.length,1,selector);return nodes[0];};
    return {selector,locator,selected,
      async getAttribute(name){const raw=one().props[name];return raw===undefined?null:String(raw);},
      async fill(value){one().props.onChange({target:{value}});f.flush();},
      async selectOption(value){one().props.onChange({target:{value}});f.flush();},
      async check(){one().props.onChange({target:{checked:true}});f.flush();},
      async click(){
        if(uiFailure===selector)throw Error('SYNTHETIC_UI_FAILURE');
        const node=one();assert.equal(node.type,'button');assert.notEqual(node.props.disabled,true);
        await node.props.onClick();f.flush();await turn(f);
        if(selector==='button[data-contact-order]'){
          await dispatch('http://127.0.0.1:3100/_next/static/example.js','GET');
          if(attack?.stage==='open')await dispatch(attack.url,attack.method,attack.body);
        }
      },
    };
  }
  const expect=actual=>({
    async toHaveCount(n){await turn(f);assert.equal(actual.selected().length,n,actual.selector);},
    async toBeVisible(){await turn(f);assert.equal(actual.selected().length,1,actual.selector);assert.equal(actual.selected()[0].hidden,false);},
    async toHaveAttribute(name,value){await turn(f);const raw=await actual.getAttribute(name);if(value instanceof RegExp)assert.match(raw,value);else assert.equal(raw,value);},
  });
  return {page,scope:{locator},expect,env,f,profile,originalOpen,dispatch,calls,contextReads,aborted,fulfilled,errors,routes,get removed(){return removed;}};
}
