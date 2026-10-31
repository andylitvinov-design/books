/** Free-only OpenRouter meditation alternative, used after explicit opt-in. */
import { WRITER_BEAT_IDS } from "./contract.mjs";
import { anonymizeMeditationBrief } from "./free-gemini.mjs";
import { requestAnonymousFreeJson } from "./free-json.mjs";
const fail=code=>Object.assign(new Error(code),{code});

export function createAnonymousOpenRouterSegmentProvider({key,fetcher=fetch}={}) {
  return async function writeSegments({brief},{signal}={}) {
    const anonymous=anonymizeMeditationBrief(brief);
    const system=[
      "Write an ORIGINAL gentle, non-clinical, self-guided meditation.",
      "Output ONLY a JSON object with exactly seven ordered segments.",
      "Each segment has beatId and text; write soothing paragraphs, not headings.",
      "Use the given locale, seven beat IDs, approved resource motif and style.",
      "Keep imagery optional, eyes may remain open, listener may stop or skip.",
      "Avoid all exclusions. Never force breathing, trauma recall, therapy,",
      "physical touch, medical diagnoses, guaranteed results or invented client facts.",
      "If the provided public micro-skill is present, include its optional practice",
      "in supportive_choice and the small transfer action in closing.",
      "Never include names, URLs, diagnoses, client data or metadata.",
    ].join(" ");
    const output=await requestAnonymousFreeJson({
      provider:"openrouter_free",key,task:"meditation",system,
      data:anonymous,maxOutputTokens:4096,fetcher,signal,
    });
    if(!Array.isArray(output.segments)||
       output.segments.length!==WRITER_BEAT_IDS.length)
      throw fail("FREE_WRITER_SEGMENT_COUNT");
    return output.segments.map((s,i)=>{
      if(s?.beatId!==WRITER_BEAT_IDS[i]||typeof s.text!=="string"||
         s.text.length<35||s.text.length>2400)
        throw fail("FREE_WRITER_SEGMENT_INVALID");
      return {text:s.text};
    });
  };
}
