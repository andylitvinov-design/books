(() => {
  const MAIN='https://holistichouse.vercel.app'
  const MONITOR='https://holistic-house-pr-monitor.vercel.app'
  const status=document.getElementById('commander-auth-status')
  function safeNext(value){
    if(typeof value!=='string'||value.length>240)return '/agents.html'
    try{
      const u=new URL(value,MONITOR)
      if(u.origin!==MONITOR||u.hash||u.pathname.includes('//'))return '/agents.html'
      const allowed=new Set(['/agents.html','/pr-monitor.html','/task-editor.html','/chats.html','/projects.html','/memory.html'])
      if(!allowed.has(u.pathname))return '/agents.html'
      if(u.pathname==='/chats.html'){
        const entries=[...u.searchParams.entries()]
        if(entries.length&&!(entries.length===1&&entries[0][0]==='task'&&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(entries[0][1])))return '/chats.html'
        return u.pathname+u.search
      }
      return u.pathname
    }catch{return '/agents.html'}
  }
  async function start(){
    const params=new URLSearchParams(location.search)
    const next=safeNext(params.get('next')||'/agents.html')
    let token=''
    try{
      const h=location.hash.startsWith('#')?location.hash.slice(1):''
      const fragment=new URLSearchParams(h)
      token=fragment.get('token')||''
    }catch{}
    // Erase the one-time token from the address bar before the first network call.
    history.replaceState(null,'',location.pathname+location.search)
    if(!token){
      const response=await fetch('/api/commander-session',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}})
      const data=await response.json().catch(()=>({}))
      if(response.ok&&data.authenticated===true){location.replace(next);return}
      status.textContent='Срок сессии истёк. Войдите ещё раз через Google на Holistic House.'
      const link=document.createElement('a');link.href=MAIN+'/commander-connect.html?next='+encodeURIComponent(next)
      link.textContent='Продолжить через Google';link.className='cc-primary';status.append(document.createTextNode(' '),link);return
    }
    if(token.length<120||token.length>8192||!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)){
      status.textContent='Передача сессии недействительна. Откройте вход через Holistic House.';return
    }
    const response=await fetch('/api/commander-session',{
      method:'POST',credentials:'same-origin',cache:'no-store',
      headers:{'Content-Type':'application/json',Accept:'application/json'},
      body:JSON.stringify({token})
    })
    token=''
    const data=await response.json().catch(()=>({}))
    if(!response.ok||data.authenticated!==true||data.owner!==true){
      status.textContent='Supabase не подтвердил права владельца. Проверьте Google-аккаунт и повторите вход.'
      return
    }
    location.replace(next)
  }
  start().catch(error=>{status.textContent='Не удалось открыть защищённое хранилище: '+String(error.message||error)})
})()
