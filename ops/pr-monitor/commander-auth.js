(() => {
  const MAIN='https://holistichouse.vercel.app'
  const MONITOR='https://holistic-house-pr-monitor.vercel.app'
  const status=document.getElementById('commander-auth-status')
  let sessionToken='',sessionRefreshToken=''

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

  async function fetchWithTimeout(url,options,label){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),11000)
    try{return await fetch(url,{...options,signal:controller.signal})}
    catch(error){
      if(error?.name==='AbortError')throw Error(label+' не ответил за 11 секунд. Повторите проверку.')
      throw error
    }finally{clearTimeout(timer)}
  }

  function retryAction(label,action){
    status.textContent=''
    status.append(document.createTextNode(label+' '))
    const button=document.createElement('button')
    button.type='button';button.className='cc-primary';button.textContent='Повторить проверку'
    button.addEventListener('click',async()=>{
      button.disabled=true
      status.textContent='Проверяю защищённую сессию…'
      try{await action()}catch(error){retryAction(String(error.message||error),action)}
    })
    status.append(button)
  }

  function googleAction(message){
    status.textContent=message+' '
    const link=document.createElement('a')
    link.href=MAIN+'/commander-connect.html?next='+encodeURIComponent(safeNext(new URLSearchParams(location.search).get('next')||'/agents.html'))
    link.textContent='Продолжить через Google';link.className='cc-primary'
    status.append(link)
  }

  async function exchangeToken(next){
    if(!sessionToken)throw Error('Токен входа отсутствует или истёк.')
    const response=await fetchWithTimeout('/api/commander-session',{
      method:'POST',credentials:'same-origin',cache:'no-store',
      headers:{'Content-Type':'application/json',Accept:'application/json'},
      body:JSON.stringify({token:sessionToken,refreshToken:sessionRefreshToken})
    },'Подтверждение владельца')
    const data=await response.json().catch(()=>({}))
    if(!response.ok||data.authenticated!==true||data.owner!==true){
      if(response.status===401||response.status===403)sessionToken=''
      throw Error(data.error||'Supabase не подтвердил права владельца.')
    }
    // Keep the token only in this page's memory until the cookie handoff succeeds.
    sessionToken=''
    location.replace(next)
  }

  async function start(){
    const params=new URLSearchParams(location.search)
    const next=safeNext(params.get('next')||'/agents.html')
    try{
      const fragment=location.hash.startsWith('#')?location.hash.slice(1):''
      const values=new URLSearchParams(fragment)
      sessionToken=values.get('token')||''
      sessionRefreshToken=values.get('refresh_token')||''
    }catch{}
    // Remove the short-lived bearer from the address bar before any network call.
    history.replaceState(null,'',location.pathname+location.search)

    if(sessionToken){
      if(sessionToken.length<120||sessionToken.length>8192||!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(sessionToken)){
        sessionToken=''
        googleAction('Передача сессии недействительна. Войдите повторно.')
        return
      }
      try{await exchangeToken(next)}catch(error){
        const message=String(error.message||error)
        if(!sessionToken)googleAction(message+' Войдите повторно через Google.')
        else retryAction(message,()=>exchangeToken(next))
      }
      return
    }

    try{
      const response=await fetchWithTimeout('/api/commander-session',{
        credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}
      },'Проверка защищённой сессии')
      const data=await response.json().catch(()=>({}))
      if(response.ok&&data.authenticated===true){location.replace(next);return}
      googleAction('Срок сессии истёк. Войдите ещё раз через Google на Holistic House.')
    }catch(error){googleAction(String(error.message||error)+' Войдите повторно через Google.')}
  }

  start().catch(error=>googleAction(String(error.message||error)+' Войдите повторно через Google.'))
})()
