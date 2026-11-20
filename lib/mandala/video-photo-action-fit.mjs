/**
 * Metadata-only physical-object relevance for an authored MyTube scene.
 * This can demote an obviously irrelevant image, never certify a literal shot.
 * Rights and JPEG decoding remain exclusively in the original renderer.
 */
const TOKEN_GROUPS=Object.freeze([
 ["rope",/\b(?:rope|cord|cuerda)\b|канат|вер[её]вк/iu,/\b(?:rope|cord|cuerda)\b|канат|вер[её]вк/iu],
 ["price",/\b(?:price|pricing|precio|tariff)\b|цен|стоимост/iu,/\b(?:price|pricing|precio|tariff)\b|цен|стоимост/iu],
 ["invoice",/\b(?:invoice|receipt|bill|factura|recibo)\b|сч[её]т|квитанц|чек/iu,/\b(?:invoice|receipt|bill|factura|recibo)\b|сч[её]т|квитанц|чек/iu],
 ["chair",/\b(?:chair|seat|silla)\b|стул|сиден/iu,/\b(?:chair|seat|silla)\b|стул|сиден/iu],
 ["mirror",/\b(?:mirror|espejo)\b|зеркал/iu,/\b(?:mirror|espejo)\b|зеркал/iu],
 ["telephone",/\b(?:phone|telephone|mobile|m[oó]vil)\b|телефон/iu,/\b(?:phone|telephone|mobile|m[oó]vil)\b|телефон/iu],
 ["door",/\b(?:door|gate|puerta)\b|двер|калитк/iu,/\b(?:door|gate|puerta)\b|двер|калитк/iu],
 ["writing",/\b(?:write|written|writing|escribir|escrito)\b|пиш[еу]|напис|запис/iu,/\b(?:write|written|writing|escribir|escrito)\b|пиш[еу]|напис|запис/iu],
 ["plant",/\b(?:plant|seedling|garden|maceta|jard[ií]n)\b|растени|росток|сад/iu,/\b(?:plant|seedling|garden|maceta|jard[ií]n)\b|растени|росток|сад/iu],
 ["glass",/\b(?:glass|cristal)\b|стекл/iu,/\b(?:glass|cristal)\b|стекл/iu]
]);
const metadata=x=>[
  ...(Array.isArray(x?.tags)?x.tags.filter(t=>typeof t==="string").slice(0,80):[]),
  String(x?.source_title||"")
].join(" ").slice(0,2200);
export const SCENE_PHOTO_SEMANTIC_VERSION="hh-scene-photo-semantic-v1";
export function assessScenePhotoMetadata(beatText,row={}){
 const requested=String(beatText??"").slice(0,800);
 const text=metadata(row);
 const anchors=TOKEN_GROUPS.filter(([,query])=>query.test(requested));
 const supported=anchors.filter(([, ,positive])=>positive.test(text)).map(([id])=>id);
 const missing=anchors.filter(([id])=>!supported.includes(id)).map(([id])=>id);
 const status=anchors.length===0?"no_literal_object_extracted":
  !missing.length?"object_hint_in_metadata":supported.length?
    "partial_object_hint_in_metadata":"required_object_not_in_metadata";
 const adjustment=anchors.length===0?0:missing.length===0?12:
  supported.length>0?-12:-34;
 return Object.freeze({status,anchors:Object.freeze(anchors.map(([id])=>id)),
  supported:Object.freeze(supported),missing:Object.freeze(missing),
  scoreAdjustment:adjustment,
  metadataOnly:true,literalVisualVerified:false,physicallyDecoded:false});
}
