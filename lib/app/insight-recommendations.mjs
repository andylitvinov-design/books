// Holistic Insight: deterministic, account-local briefing. Never infer visits, bookings or clinical outcomes.
const LANG = {
  ru: {
    replyTitle:'Ответить на обращения', replyText:n=>'Есть '+n+' обращений, ожидающих вашего ответа.',
    profileTitle:'Добавить фотографию', profileText:'В профессиональном профиле пока нет фотографии.',
    practiceTitle:'Оформить свою практику', practiceText:'Начните с профессионального профиля, когда будете готовы принимать клиентов.',
    firstTitle:'Добавить первую услугу', firstText:'Опубликуйте предложение, чтобы клиентам было проще познакомиться с вашей работой.',
    publishTitle:'Проверить публикацию услуг', publishText:'Услуги созданы, но пока нет опубликованных активных предложений.',
    copyTitle:'Улучшить описание услуги', copyText:'Проверьте название, фотографию и описание выбранной услуги.',
    marketingTitle:'Проверить интерес к услуге', marketingText:'Есть показы, но не зарегистрированы переходы. Это повод проверить карточку, а не доказательство проблемы.',
    tasksTitle:'Посмотреть задачи по клиентам', tasksText:n=>'Просроченных задач: '+n+'.',
    goalsTitle:'Выбрать личные цели', goalsText:'Отметьте направления, которые важны лично вам. Ничего не выбирается автоматически.',
    testsTitle:'Продолжить личные исследования', testsText:'Можно пройти ещё один тест — только если вам это интересно.',
    courseTitle:'Продолжить обучение', courseText:'В вашем личном кабинете доступен курс для самостоятельной практики.'
  },
  en: {
    replyTitle:'Reply to enquiries', replyText:n=>n+' enquiries are waiting for your reply.',
    profileTitle:'Add a profile photo', profileText:'Your practitioner profile does not have a photo yet.',
    practiceTitle:'Set up your practice', practiceText:'Create a practitioner profile when you want to offer services.',
    firstTitle:'Create your first service', firstText:'Publish an offer so people can discover your work.',
    publishTitle:'Review unpublished services', publishText:'You have services but no active published offers yet.',
    copyTitle:'Improve a service page', copyText:'Review its title, photograph and description.',
    marketingTitle:'Review service interest', marketingText:'Views were recorded but no link clicks. This suggests checking the page, not a proven conversion problem.',
    tasksTitle:'Review follow-up tasks', tasksText:n=>n+' client tasks are overdue.',
    goalsTitle:'Choose personal goals', goalsText:'Select what matters to you; nothing is inferred automatically.',
    testsTitle:'Explore your interests', testsText:'Take another self-assessment only if it would be useful to you.',
    courseTitle:'Continue learning', courseText:'You can continue your self-guided practice in the private Cabinet.'
  },
  es: {
    replyTitle:'Responder solicitudes', replyText:n=>n+' solicitudes esperan tu respuesta.',
    profileTitle:'Añadir una foto', profileText:'Tu perfil profesional todavía no tiene foto.',
    practiceTitle:'Crear tu práctica', practiceText:'Crea tu perfil profesional cuando quieras ofrecer servicios.',
    firstTitle:'Añadir un servicio', firstText:'Publica una oferta para que las personas conozcan tu trabajo.',
    publishTitle:'Revisar servicios', publishText:'Hay servicios, pero ninguno publicado y activo.',
    copyTitle:'Mejorar la descripción', copyText:'Revisa el título, la foto y la descripción de un servicio.',
    marketingTitle:'Revisar el interés', marketingText:'Hay vistas pero no clics registrados. Revisa la página; no demuestra un problema de conversión.',
    tasksTitle:'Revisar tareas', tasksText:n=>n+' tareas con clientes están atrasadas.',
    goalsTitle:'Elegir objetivos personales', goalsText:'Elige tus prioridades; no se infieren automáticamente.',
    testsTitle:'Explorar tus intereses', testsText:'Haz otra autoevaluación solo si te interesa.',
    courseTitle:'Continuar aprendiendo', courseText:'Puedes continuar tu curso personal en tu cuenta privada.'
  }
};
const count = n => Number.isSafeInteger(Number(n)) && Number(n) > 0 ? Number(n) : 0;
export function buildDailyInsight({practice=null,orders=null,journey=null,goals=null,personalEnabled=false,locale='en'}={}) {
  const lang = ['en','ru','es'].includes(locale) ? locale : 'en';
  const t=LANG[lang], root='/'+lang+'/app';
  const services=Array.isArray(practice?.services)?practice.services.filter(s=>s?.status!=='archived'):[];
  const practitioner=practice?.practitioner||null;
  const requests=Array.isArray(practice?.requests)?practice.requests:[];
  const waiting=requests.filter(x=>x?.needsReply===true).length;
  const taskRows=Array.isArray(practice?.practitionerTaskSummary?.requests)?practice.practitionerTaskSummary.requests:[];
  const overdue=taskRows.reduce((sum,row)=>sum+count(row?.overdueCount),0);
  const active=services.filter(s=>s?.status==='published'&&s?.active===true);
  const metrics=practice?.serviceAnalytics;
  const period=typeof metrics?.yesterday==='string' && /^\d{4}-\d{2}-\d{2}$/.test(metrics.yesterday)?metrics.yesterday:null;
  const week=typeof metrics?.weekStart==='string' && /^\d{4}-\d{2}-\d{2}$/.test(metrics.weekStart)?metrics.weekStart:null;
  const measured=Boolean(practitioner&&Array.isArray(metrics?.services)&&period&&week);
  const sum=measured?metrics.services.reduce((a,s)=>{
    for(const k of ['impressions','orders','whatsapp','telegram'])a[k]+=count(s?.week?.[k]);
    return a;
  },{impressions:0,orders:0,whatsapp:0,telegram:0}):null;
  const suggestions=[];
  const add=(id,category,priority,title,reason,href,proof)=>{
    suggestions.push({id,category,priority,title,reason,href,evidence:proof,status:'new'});
  };
  if(practitioner) {
    if(waiting>0)add('clients-reply','clients',100,t.replyTitle,t.replyText(waiting),root+'/messages?section=clients', 'requests.needsReply');
    if(overdue>0)add('clients-overdue','clients',95,t.tasksTitle,t.tasksText(overdue),root+'/practice?panel=requests','practitionerTaskSummary.overdueCount');
    if(!String(practitioner?.profile?.photoPath||practitioner?.draftProfile?.photoPath||'').trim())
      add('profile-photo','profile',75,t.profileTitle,t.profileText,root+'/practice?panel=profile','practitioner.profile.photoPath');
    if(services.length===0)add('service-first','marketing',65,t.firstTitle,t.firstText,root+'/practice?panel=services','services.length');
    else if(active.length===0)add('service-publish','marketing',60,t.publishTitle,t.publishText,root+'/practice?panel=services','services.status');
    else {
      const incomplete=active.find(s=>!String(s?.copy?.description||s?.localizedCopy?.[lang]?.description||s?.copy?.shortDescription||'').trim());
      if(incomplete)add('service-description','marketing',55,t.copyTitle,t.copyText,root+'/practice?panel=services','service.description');
    }
    if(measured){
      const promising=metrics.services.filter(s=>count(s?.week?.impressions)>=25 &&
        count(s?.week?.orders)+count(s?.week?.whatsapp)+count(s?.week?.telegram)===0)
        .sort((a,b)=>count(b.week.impressions)-count(a.week.impressions))[0];
      if(promising)add('marketing-view-to-click','marketing',50,t.marketingTitle,t.marketingText,
        root+'/practice?panel=analytics','service_funnel_daily.week');
    }
  }
  if(personalEnabled && goals) {
    if(!goals.revision || !goals.goals) add('personal-goals','personal',45,t.goalsTitle,t.goalsText,root+'/portrait','development_goals.missing');
    else if(journey) {
      if(count(journey.testsCompleted)<3)add('personal-tests','personal',35,t.testsTitle,t.testsText,root+'/portfolio','journey.testsCompleted');
      else if(journey.courseCompleted===false)add('personal-course','personal',30,t.courseTitle,t.courseText,root+'/my-course','journey.courseCompleted');
    }
  }
  suggestions.sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id));
  return {
    role:practitioner?'practitioner':'member',
    services:practitioner?{total:services.length,published:active.length}:null,
    requests:practitioner?{waiting,overdue}:null,
    analytics:measured?{period,weekStart:week,totals:sum,tracked:true}:null,
    registration:practitioner&&practice?.registrationStats
      ?{last7:count(practice.registrationStats.last7),last30:count(practice.registrationStats.last30)}:null,
    ordersCount:Array.isArray(orders)?orders.length:null,
    personal:personalEnabled && journey?{
      testsCompleted:count(journey.testsCompleted),courseCompleted:journey.courseCompleted===true,
      goalsSaved:Boolean(goals?.revision>0)}:null,
    recommendations:suggestions.slice(0,8)
  };
}
