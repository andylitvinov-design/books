#!/usr/bin/env python3
"""Reconcile saved public Joomla/Quix Academy evidence without changing routes."""
import argparse
import csv
import hashlib
import json
import re
from collections import Counter
from pathlib import Path
from urllib.parse import parse_qs, urlparse

KEY = re.compile(r"(?i)(academy|reiki|myster|мистер|курс|course|training|обуч|rune|руны|meditat|медита|temple|shaman|tantra|тангр|артеф|maya|майя|egypt|егип|greece|грец)")
ROUTES = {
    "30":"reiki/free-energy-healing", "31":"reiki/yggdrasil", "40":"reiki/master-shamanic-healing",
    "41":"path/magister-archetypal-therapies", "44":"runes/runes-business", "50":"reiki/tantra-reiki",
    "52":"mysteries/initiations", "54":"reiki/yggdrasil/faq", "56":"mysteries/archetypes-of-love",
    "68":"mysteries/egyptian-hypno-course", "70":"videos/energy-pump-ups", "71":"elements/elemental-magic",
    "72":"elements/water", "98":"videos/sun-meditations", "99":"videos/greek-mysteries-demeter",
    "100":"videos/planetary-power", "101":"videos/strength-protection", "102":"videos/maya-archetypes",
    "103":"videos/egypt-osiris", "104":"videos/greek-mysteries-dionysus", "108":"videos/sun-meditations",
    "111":"traditions/egypt", "112":"traditions/greece", "131":"symbolic/artifacts-talismans",
    "34":"history/student-experiences", "53":"mysteries/archetypes-of-love", "57":"mysteries/archetypes-of-gods",
    "61":"mysteries/initiations", "62":"runes/runes-business", "67":"mysteries/egyptian-hypno-course", "91":"reiki/yggdrasil",
}
LIBRARY, SERVICES = {"109","93"}, {"73","115"}
ARCHIVE, SYSTEM, REVIEW = {"16","21","35","36","38","39","94","121","122","139"}, {"75","84"}, {"10","12","13","81","87"}
CLASSES = ("Academy", "Library", "Services", "Archive", "Duplicate", "Private Preserve", "System Ignore", "Needs Review")

def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def page_id(row):
    for source in row.get("source_ids") or []:
        if source.get("type") == "quix": return str(source["id"])
    return (parse_qs(urlparse(row["url"]).query).get("id") or [None])[0]

def locale(row): return "ru" if str(row.get("locale", "")).lower().startswith("ru") else "en"

def classify(row):
    ident = page_id(row)
    logical = ROUTES.get(ident)
    source_types = {item.get("type") for item in row.get("source_ids") or []}
    if logical: return ("Duplicate" if source_types == {"menu_context"} else "Academy"), logical
    if ident in LIBRARY: return "Library", None
    if ident in SERVICES: return "Services", None
    if ident in ARCHIVE: return "Archive", None
    if ident in SYSTEM: return "System Ignore", None
    return "Needs Review", None

def target(kind, logical, loc):
    if kind in {"Academy","Duplicate"} and logical: return f"/{loc}/academy/{logical}"
    if kind == "Library": return f"/{loc}/library"
    if kind == "Services": return f"/{loc}/services"
    if kind == "Archive": return f"/{loc}/academy/archive"
    return None

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--inventory", required=True); ap.add_argument("--url-map", required=True); ap.add_argument("--backup-manifest", required=True)
    ap.add_argument("--root", default=Path(__file__).resolve().parents[2], type=Path)
    args = ap.parse_args(); root = args.root; data = root / "data/academy"; docs = root / "docs"
    inventory = json.loads(Path(args.inventory).read_text(encoding="utf-8"))
    records = json.loads((data / "sources.generated.json").read_text(encoding="utf-8"))
    media = json.loads((data / "media.generated.json").read_text(encoding="utf-8"))
    url_map = json.loads((data / "url-map.generated.json").read_text(encoding="utf-8"))
    candidates = []
    for index, raw in enumerate(inventory["results"]):
        text = " ".join([str(raw.get("title") or ""), " ".join(raw.get("h1") or [])])
        if not KEY.search(text): continue
        kind, logical = classify(raw); loc = locale(raw); ids = raw.get("source_ids") or []
        key = hashlib.sha256(f"{raw['url']}|{raw.get('content_sha256')}|{index}".encode()).hexdigest()[:20]
        canonical = next((r["sourceUrl"] for r in records if r.get("logicalId") == logical), raw["url"])
        candidates.append({"provenanceKey":key,"sourceUrl":raw["url"],"sourceIds":ids,"sourceIdKeys":[f"{x.get('type')}:{x.get('id')}:{x.get('language','*')}" for x in ids],"sourceTitle":raw.get("title"),"sourceH1":raw.get("h1") or [],"sourceContentHash":raw.get("content_sha256"),"sourceVisibleTextHash":raw.get("visible_text_sha256"),"sourceDuplicateGroup":raw.get("exact_text_duplicate_group"),"sourceLocale":loc,"sourceStatus":raw.get("status"),"sourceDecision":raw.get("decision"),"preservationClassification":kind,"logicalId":logical,"canonicalPsiTrendsUrl":canonical,"canonicalAcademyUrl":target(kind, logical, loc),"publication":"represented_by_existing_record" if kind == "Academy" else "not_published_from_backup"})
    for record in records:
        record["backupProvenance"] = [{k:b[k] for k in ("provenanceKey","sourceUrl","sourceIds","sourceContentHash","sourceVisibleTextHash")} for b in candidates if b["preservationClassification"] == "Academy" and b["logicalId"] == record.get("logicalId")]
    by_source = {record["sourceUrl"]:record.get("contentHash") for record in records}
    for item in media: item["sourceDocumentSha256"] = by_source.get(item["sourceUrl"])
    backup_url_rows = [{"sourceUrl":b["sourceUrl"],"sourceIds":b["sourceIds"],"classification":"BACKUP_"+b["preservationClassification"].upper().replace(" ","_"),"preservationClassification":b["preservationClassification"],"logicalId":b["logicalId"],"canonicalPsiTrendsUrl":b["canonicalPsiTrendsUrl"],"target":b["canonicalAcademyUrl"],"redirectNow":False} for b in candidates]
    url_map += backup_url_rows
    review = [{**b,"reason":"Saved Joomla/Quix educational candidate has no safe, exact Academy mapping"} for b in candidates if b["preservationClassification"] == "Needs Review"]
    count = Counter(b["preservationClassification"] for b in candidates); id_count = len({x for b in candidates for x in b["sourceIdKeys"]})
    summary = {"backupEvidenceRecordCount":len(candidates),"backupSourceIdCount":id_count,"classifiedSourceIdCount":id_count,"unclassifiedSourceIdCount":0,"classificationCounts":{name:count[name] for name in CLASSES},"privateDataRead":False,"mediaHashAvailability":"No standalone backup media SHA-256 values were present in the anonymous inventory; source document hashes are retained instead.","sourceEvidence":{"inventorySha256":sha(args.inventory),"urlMapSha256":sha(args.url_map),"urlMapRowCount":sum(1 for _ in csv.DictReader(Path(args.url_map).open(encoding="utf-8"))),"backupManifestSha256":sha(args.backup_manifest)}}
    (data/"sources.generated.json").write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding="utf-8")
    (data/"media.generated.json").write_text(json.dumps(media,ensure_ascii=False,indent=2),encoding="utf-8")
    (data/"url-map.generated.json").write_text(json.dumps(url_map,ensure_ascii=False,indent=2),encoding="utf-8")
    (data/"preservation.generated.json").write_text(json.dumps(candidates,ensure_ascii=False,indent=2),encoding="utf-8")
    (data/"preservation-summary.generated.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding="utf-8")
    (data/"needs-review.generated.json").write_text(json.dumps(review,ensure_ascii=False,indent=2),encoding="utf-8")
    def write_csv(path, fields, rows):
        with path.open("w",encoding="utf-8",newline="") as f:
            writer=csv.DictWriter(f,fieldnames=fields,lineterminator="\n"); writer.writeheader()
            for row in rows:
                row=dict(row); row["sourceIds"]=json.dumps(row.get("sourceIds") or [],ensure_ascii=False) if "sourceIds" in fields else None; writer.writerow({k:row.get(k) for k in fields})
    source_rows = [{"sourceKind":"live","sourceUrl":r["sourceUrl"],"sourceIds":[],"backupProvenance":json.dumps(r.get("backupProvenance") or [],ensure_ascii=False),"preservationClassification":None,"canonicalPsiTrendsUrl":r["sourceUrl"],"canonicalAcademyUrl":f"/{r.get('sourceLocale','en')}/academy/{r['logicalId']}","classification":r["classification"],"logicalId":r["logicalId"],"sourceLocale":r.get("sourceLocale"),"contentHash":r.get("contentHash")} for r in records]
    source_rows += [{"sourceKind":"backup",**b,"contentHash":b["sourceContentHash"]} for b in candidates]
    write_csv(docs/"academy-source-manifest.csv",["sourceKind","sourceUrl","sourceIds","backupProvenance","preservationClassification","canonicalPsiTrendsUrl","canonicalAcademyUrl","classification","logicalId","sourceLocale","contentHash"],source_rows)
    write_csv(docs/"academy-url-map.csv",["sourceUrl","sourceIds","classification","preservationClassification","logicalId","canonicalPsiTrendsUrl","target","redirectNow"],url_map)
    write_csv(docs/"academy-media-manifest.csv",["sourceUrl","mediaUrl","logicalId","status","sourceDocumentSha256"],media)
    write_csv(docs/"academy-needs-review.csv",["provenanceKey","sourceUrl","sourceIds","reason","sourceTitle","sourceContentHash","sourceVisibleTextHash"],review)
    report=["# Holistic House Academy migration report","", "## Preservation reconciliation", "", f"- Backup-only educational source records: **{len(candidates)}**", f"- Joomla/Quix source identifiers reconciled: **{id_count} / {id_count}**", f"- Source inventory SHA-256: **{summary['sourceEvidence']['inventorySha256']}**", f"- PsiTrends URL map SHA-256: **{summary['sourceEvidence']['urlMapSha256']}**", f"- Joomla backup manifest SHA-256: **{summary['sourceEvidence']['backupManifestSha256']}**", "", "## Classification", ""]
    report += [f"- {name}: **{count[name]}**" for name in CLASSES]
    report += ["", "## Safety", "", "- Only exact Joomla/Quix-to-existing-logical-ID matches are attached to Academy records.", "- Duplicate context variants, services, library material and archive records are preserved but not published as new Academy content.", "- Needs Review is the exact unresolved subset; no private/user/session data was read.", "- No PsiTrends redirects or production data were changed; no video was generated.", "- Standalone backup media hashes were unavailable, so source-document SHA-256 is retained with each media reference."]
    (docs/"academy-migration-report.md").write_text("\n".join(report)+"\n",encoding="utf-8")
    print(f"reconciled {len(candidates)} records / {id_count} source IDs")

if __name__ == "__main__": main()
