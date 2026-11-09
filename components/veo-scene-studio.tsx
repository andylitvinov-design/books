"use client";

import { useRef, useState } from "react";
import { checkVeoSceneAction, generateVeoSceneAction } from "@/app/admin/videos/veo-actions";

type Locale = "ru" | "en" | "es";
type Props = { initialLocale: Locale; configured: boolean; enabled: boolean };
type VeoTask = { operationName: string; status: string; videoGcsUri?: string | null; estimatedUsdCents?: number };

const COPY = {
  ru: {
    title: "Google Veo 3.1 Lite · AI-видео без звука",
    intro: "Только для владельца: 1080p, 16:9 или 9:16, клип 4/6/8 секунд. Голос и музыку добавляем отдельно в Holistic House.",
    disabled: "Платные запросы отключены на сервере. Черновики и расчёт стоимости доступны бесплатно.",
    missing: "Google Cloud пока не настроен. Требуются авторизованный проект, сервисный аккаунт и закрытое хранилище.",
    prompt: "Описание новой видеосцены", aspect: "Формат", duration: "Длительность",
    quote: "Оценка за одну попытку", rights: "Это разрешённый публичный сюжет, без клиентских/медицинских данных.",
    approved: "Разрешаю одну платную генерацию по указанной оценке.", generate: "Сгенерировать (платно)",
    busy: "Отправка…", id: "ID операции Google", check: "Проверить статус", checking: "Проверка…",
    result: "Статус", storage: "Исходный MP4 остаётся в закрытом Cloud Storage. QA, импорт и публикация — отдельные действия.",
    uncertain: "Результат отправки неизвестен. Не отправляйте повторный платный запрос до сверки в Google Cloud.",
  },
  en: {
    title: "Google Veo 3.1 Lite · silent AI scenes",
    intro: "Owner-only: 1080p, 16:9 or 9:16, 4/6/8-second clips. Holistic House adds music and narration separately.",
    disabled: "Paid calls are disabled on the server. Drafts and cost estimates are free.",
    missing: "Google Cloud is not yet configured. An authorized project, service account and private storage are required.",
    prompt: "New scene description", aspect: "Aspect", duration: "Duration",
    quote: "Estimated cost per attempt", rights: "Approved public concept; no client or private health data.",
    approved: "I approve one paid generation at the estimated cost.", generate: "Generate (paid)",
    busy: "Submitting…", id: "Google operation ID", check: "Check status", checking: "Checking…",
    result: "Status", storage: "Source MP4 remains private in Cloud Storage. QA, import and publication are separate actions.",
    uncertain: "Submission outcome unknown. Do not retry a paid task until reconciled in Google Cloud.",
  },
  es: {
    title: "Google Veo 3.1 Lite · escenas sin audio",
    intro: "Solo propietario: 1080p, 16:9 o 9:16, clips de 4/6/8 segundos. Holistic House añade música y voz.",
    disabled: "Generación de pago desactivada. Los borradores y presupuestos son gratuitos.",
    missing: "Google Cloud aún no está configurado. Se necesita proyecto autorizado y almacenamiento privado.",
    prompt: "Descripción de escena", aspect: "Formato", duration: "Duración",
    quote: "Coste estimado por intento", rights: "Concepto público aprobado, sin datos privados de clientes.",
    approved: "Autorizo una generación de pago al coste estimado.", generate: "Generar (de pago)",
    busy: "Enviando…", id: "ID de operación", check: "Comprobar estado", checking: "Comprobando…",
    result: "Estado", storage: "MP4 privado en Cloud Storage. QA, importación y publicación son independientes.",
    uncertain: "Resultado incierto. No reintente una generación de pago sin revisar Google Cloud.",
  },
};
const errors: Record<string,string> = {
  unauthorized: "Administrator login required", disabled: "Paid generation disabled",
  not_configured: "Google Cloud not connected", approval: "Approval required",
  quote_changed: "Quote changed", validation: "Invalid scene parameters",
  provider_unavailable: "Provider unavailable", unknown: "Unknown error",
};
export function VeoSceneStudio({ initialLocale, configured, enabled }: Props) {
  const t = COPY[initialLocale] || COPY.en;
  const [prompt, setPrompt] = useState("Cinematic slow tracking shot through a quiet green forest after rain, natural sunbeams through foliage, warm light and subtle realistic breeze, no people, no words or titles.");
  const [duration, setDuration] = useState<4 | 6 | 8>(6);
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [rights, setRights] = useState(false);
  const [approval, setApproval] = useState(false);
  const [operationName, setOperationName] = useState("");
  const [task, setTask] = useState<VeoTask | null>(null);
  const [busy, setBusy] = useState(false);
  const submitLock = useRef(false);
  const [checking, setChecking] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!enabled || !configured || !rights || !approval || busy || uncertain || submitLock.current) return;
    submitLock.current = true;
    setBusy(true); setError("");
    try {
      const response = await generateVeoSceneAction({
        mode: "text", prompt, duration, aspectRatio, resolution: "1080p",
        generateAudio: false, publicContentApproved: true,
        paidApproved: true, approvedMaxUsdCents: duration * 5,
      });
      if (response.ok && response.result) {
        const result = response.result as VeoTask;
        setTask(result); setOperationName(result.operationName); setApproval(false);
      } else {
        setError(response.error || "unknown");
        if (response.mayHaveSubmitted) setUncertain(true);
      }
    } catch { setError("provider_unavailable"); setUncertain(true); }
    finally { submitLock.current = false; setBusy(false); }
  }

  async function check() {
    if (!configured || !operationName || checking) return;
    setChecking(true); setError("");
    try {
      const response = await checkVeoSceneAction({operationName});
      if (response.ok && response.result) setTask(response.result as VeoTask);
      else setError(response.error || "unknown");
    } catch { setError("provider_unavailable"); }
    finally { setChecking(false); }
  }

  return (
    <section className="site-video-review-entry" aria-label="Google Veo Lite" style={{display:"block",padding:18,marginBlock:18}}>
      <h2 style={{fontSize:"1.2rem",fontWeight:700,marginBottom:8}}>{t.title}</h2>
      <p>{t.intro}</p>
      {!enabled && <p role="status">{t.disabled}</p>}
      {!configured && <p role="status">{t.missing}</p>}
      <label htmlFor="veo-scene-prompt" style={{display:"block",marginTop:12}}>{t.prompt}</label>
      <textarea id="veo-scene-prompt" rows={3} value={prompt} onChange={event=>{setPrompt(event.target.value);setApproval(false);}}
        style={{width:"100%",padding:10,marginTop:5,border:"1px solid #9ca3af",borderRadius:8,fontSize:14}} />
      <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBlock:12}}>
        <label>{t.aspect}{" "}
          <select value={aspectRatio} onChange={e=>{setAspectRatio(e.target.value as "16:9" | "9:16");setApproval(false);}}>
            <option>16:9</option><option>9:16</option>
          </select>
        </label>
        <label>{t.duration}{" "}
          <select value={duration} onChange={e=>{setDuration(Number(e.target.value) as 4 | 6 | 8);setApproval(false);}}>
            <option value="4">4 s</option><option value="6">6 s</option><option value="8">8 s</option>
          </select>
        </label>
        <span>{t.quote}: <strong>{"$" + (duration * 0.05).toFixed(2) + " USD"}</strong></span>
      </div>
      <label style={{display:"block",marginBlock:8}}>
        <input type="checkbox" checked={rights} onChange={e=>{setRights(e.target.checked);setApproval(false);}} /> {t.rights}
      </label>
      <label style={{display:"block",marginBlock:8}}>
        <input type="checkbox" checked={approval} onChange={e=>setApproval(e.target.checked)} /> {t.approved}
      </label>
      <button type="button" disabled={!enabled||!configured||!approval||!rights||busy||uncertain||prompt.trim().length<20}
        onClick={submit} style={{padding:"10px 14px",borderRadius:8,border:"1px solid #475569",opacity:enabled&&configured?1:.55}}>
        {busy ? t.busy : t.generate}
      </button>
      {uncertain && <p role="alert">{t.uncertain}</p>}
      <div style={{marginTop:14}}>
        <label htmlFor="veo-operation-id" style={{display:"block"}}>{t.id}</label>
        <input id="veo-operation-id" type="text" value={operationName} onChange={e=>setOperationName(e.target.value)}
          style={{width:"100%",padding:8,border:"1px solid #9ca3af",borderRadius:8}} />
        <button type="button" disabled={!operationName||!configured||checking} onClick={check}
          style={{padding:"8px 12px",marginTop:8,border:"1px solid #9ca3af",borderRadius:8}}>
          {checking ? t.checking : t.check}
        </button>
      </div>
      {error && <p role="alert" style={{marginTop:8}}>{errors[error] || errors.unknown}</p>}
      {task && <div role="status" style={{marginTop:10,overflowWrap:"anywhere"}}>
        {t.result}: {task.status}
        {task.videoGcsUri && <p><code>{task.videoGcsUri}</code></p>}
      </div>}
      <p style={{fontSize:12,marginTop:10}}>{t.storage}</p>
    </section>
  );
}
