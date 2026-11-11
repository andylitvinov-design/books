#!/usr/bin/env python3
"""One-time, incremental, verified 364-MP4 extension of 320 original videos.

No download, paid provider, user media, photorealistic content or re-encoding of
the original 320 masters. Keeps 44 separately licensed stock masters untouched.
Exactly 684 original animated MP4s + 44 licensed = 728 total source records.
"""
import argparse
import hashlib
import importlib.util
import json
import math
import random
import shutil
from pathlib import Path
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parent.parent
COLLECTION="original-motion-v1"
FOLDER=Path("public/videos/holistic-house")/COLLECTION
MANIFEST=Path("data/video-catalog/original-motion-scenes-v1.json")
TAXONOMY=Path("data/video-catalog/mytube-content-taxonomy-4x4x4-v1.json")
EXISTING=320
ADDITIONAL=364
FINAL=684
PUBLIC_LIBRARY_TOTAL=728
NEW_VARIANTS=range(5,10)  # v6 .. v10 for every topic
EXTRA_VARIANT=10           # v11 for 44 high-need topics

STYLE_DATA={
    "aurora":dict(motifs=["sky","light","abstract"],ru="Северное сияние",en="Aurora lights",es="Aurora luminosa"),
    "orbit":dict(motifs=["stars","sky","abstract"],ru="Орбиты света",en="Light orbits",es="Órbitas de luz"),
    "bloom":dict(motifs=["flowers","garden","abstract"],ru="Раскрытие цветка",en="Blooming light",es="Flor de luz"),
    "sunburst":dict(motifs=["sun","light","sky"],ru="Лучи восхода",en="Sunrise rays",es="Rayos del amanecer"),
    "ripple":dict(motifs=["water","river","abstract"],ru="Круги на воде",en="Ripple circles",es="Ondas circulares"),
    "path":dict(motifs=["road","horizon","light"],ru="Путь к горизонту",en="Light path",es="Camino de luz"),
}
STYLE_IDS=tuple(STYLE_DATA)

def load_builder():
    path=ROOT/"scripts/build-original-motion-320.py"
    spec=importlib.util.spec_from_file_location("hh_original_motion_320",path)
    if not spec or not spec.loader:
        raise RuntimeError("missing_verified_320_builder")
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

def style_for(topic_index,version):
    # Independent of original v1..v5 patterns; rotate the six new families.
    return STYLE_IDS[(topic_index*5+version)%len(STYLE_IDS)]

def apply_distinct_vector_styles(builder):
    original_vector=builder.vector_art

    def extended(w,h,category,topic,variant,seed,path):
        # Original vector layer retains project visual language while each
        # new design adds a recognizably different symbolic geometric subject.
        _,palette=original_vector(w,h,category,topic,variant,seed,path)
        style=style_for(category*16+topic,variant)
        rng=random.Random(seed+919351)
        foreground=builder.rgb(palette[2])
        original=Image.open(path).convert("RGBA")
        sheet=Image.new("RGBA",(w,h),(0,0,0,0))
        draw=ImageDraw.Draw(sheet,"RGBA")
        cx=w*.5+rng.uniform(-w*.09,w*.09)
        cy=h*.46+rng.uniform(-h*.08,h*.08)
        thick=max(2,round(w/180))
        def color(alpha):
            return (*foreground,alpha)
        if style=="aurora":
            for band in range(11):
                coords=[]
                for x in range(-10,w+21,12):
                    y=h*.19+band*15+math.sin(x*.025+seed*.0001+band*.4)*32
                    coords.append((x,y))
                draw.line(coords,fill=color(max(22,125-band*9)),width=thick+1)
            for k in range(5):
                draw.arc((w*.05+k*8,h*.14,w*.95-k*7,h*.72),
                         204,332,fill=color(55+k*10),width=thick)
        elif style=="orbit":
            for k in range(9):
                radius=(50+k*25)
                draw.ellipse((cx-radius,cy-radius*.54,cx+radius,cy+radius*.54),
                             outline=color(40+k*7),width=thick)
                angle=seed*.0003+k*math.tau/9
                x=cx+radius*math.cos(angle)
                y=cy+radius*.54*math.sin(angle)
                draw.ellipse((x-7,y-7,x+7,y+7),fill=color(130))
        elif style=="bloom":
            for k in range(15):
                phi=k*math.tau/15+seed*.0001
                x=cx+math.cos(phi)*min(w*.32,150)
                y=cy+math.sin(phi)*min(h*.24,165)
                draw.ellipse((x-24,y-59,x+24,y+49),
                             outline=color(120),width=thick)
                draw.line([(cx,cy),(x,y)],fill=color(60),width=thick)
            draw.ellipse((cx-24,cy-24,cx+24,cy+24),fill=color(115))
        elif style=="sunburst":
            for k in range(44):
                phi=k*math.tau/44+seed*.0004
                r0=38+(k%4)*3
                r1=135+(k%6)*18
                draw.line([(cx+math.cos(phi)*r0,cy+math.sin(phi)*r0),
                           (cx+math.cos(phi)*r1,cy+math.sin(phi)*r1)],
                          fill=color(30+(k%5)*18),width=thick)
            for r in [38,60,100,150]:
                draw.ellipse((cx-r,cy-r,cx+r,cy+r),
                             outline=color(90),width=thick)
        elif style=="ripple":
            for k in range(13):
                radius=27+k*19
                draw.arc((cx-radius,cy-radius*.39,
                          cx+radius,cy+radius*.39),
                         start=20,end=340,fill=color(22+k*7),width=thick)
            for j in range(15):
                x=rng.randrange(w)
                y=h*.43+rng.randrange(round(h*.45))
                draw.line((x,y,x+20,y-13),fill=color(55),width=thick)
        elif style=="path":
            for k in range(12):
                y=h*.72+k*14
                x0=cx-w*.07-k*12
                x1=cx+w*.07+k*12
                draw.line((x0,y,x1,y),fill=color(24+k*8),width=thick)
            for j in range(8):
                theta=j*math.tau/8
                x=cx+math.cos(theta)*min(w*.19,92)
                y=cy+math.sin(theta)*min(w*.19,92)
                draw.ellipse((x-9,y-9,x+9,y+9),outline=color(120),
                             width=thick)
            draw.line((cx,h*.38,cx,h*.92),fill=color(78),width=thick+1)
        else:
            raise RuntimeError("unknown_symbolic_style")

        original=Image.alpha_composite(original,sheet)
        original.save(path,optimize=True)
        return style,palette

    builder.vector_art=extended
    builder.MOTIFS.update({
        key:STYLE_DATA[key]["motifs"] for key in STYLE_IDS
    })

def expected_new_rows(builder,taxonomy):
    roots=builder.scene_rows(taxonomy)
    if len(roots)!=320:
        raise RuntimeError("missing_exact_64_topic_tree")
    result=[]
    first=0
    for topic_index in range(64):
        category,topic_in_category,_,cat,sub,topic=roots[topic_index*5]
        for variant in NEW_VARIANTS:
            result.append((category,topic_in_category,variant,cat,sub,topic))
        # Prioritize love and stress (32 topics), then 12 energy topics.
        if cat["id"] in ("love-relationships","stress-recovery") or (
            cat["id"]=="energy-confidence" and topic_in_category<12):
            result.append((category,topic_in_category,EXTRA_VARIANT,cat,sub,topic))
            first+=1
    if first!=44 or len(result)!=ADDITIONAL:
        raise RuntimeError("extension_variant_count_incorrect")
    return result

def media_file(root,record,extension):
    rel=record["video"] if extension==".mp4" else record["poster"]
    prefix="/videos/holistic-house/original-motion-v1/"
    if not isinstance(rel,str) or not rel.startswith(prefix) or not rel.endswith(extension):
        raise RuntimeError("media_path_not_first_party")
    return root/"public"/rel.lstrip("/")

def physical_check(root,record,decode=False,builder=None):
    if (record.get("media")!="original_motion_mp4" or
        record.get("collection")!=COLLECTION or
        record.get("status")!="approved" or
        record.get("visualOrigin")!="original_procedural_non_photographic" or
        record.get("rightsReference",{}).get("kind")!="project_generated_original" or
        record.get("rightsReference",{}).get("thirdPartyFootage") is not False):
        raise RuntimeError("unverified_original_motion_rights")
    movie=media_file(root,record,".mp4")
    poster=media_file(root,record,".jpg")
    if not movie.is_file() or not poster.is_file():
        raise RuntimeError("physical_media_missing_"+record["id"])
    if movie.stat().st_size!=record.get("bytes") or poster.stat().st_size<1000:
        raise RuntimeError("physical_media_size_mismatch_"+record["id"])
    digest=hashlib.sha256(movie.read_bytes()).hexdigest()
    if digest!=record.get("sha256"):
        raise RuntimeError("physical_media_hash_mismatch_"+record["id"])
    if decode and builder:
        # The original creator already validates codec, duration and motion.
        if builder.media_proof(movie,poster,432,768,5,18,True)!=digest:
            raise RuntimeError("codec_or_motion_proof_failed_"+record["id"])
    return digest

def run():
    p=argparse.ArgumentParser()
    p.add_argument("--verify",action="store_true")
    p.add_argument("--check-only",action="store_true")
    p.add_argument("--max-mebibytes",type=int,default=95)
    args=p.parse_args()
    root=ROOT
    if args.max_mebibytes<65 or args.max_mebibytes>150:
        raise RuntimeError("unsafe_encoded_budget")
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        raise RuntimeError("ffmpeg_and_ffprobe_required")
    builder=load_builder()
    taxonomy=json.loads((root/TAXONOMY).read_text(encoding="utf8"))
    additions=expected_new_rows(builder,taxonomy)
    manifest_path=root/MANIFEST
    manifest=json.loads(manifest_path.read_text(encoding="utf8"))
    existing=manifest["scenes"]
    if manifest["count"] not in (EXISTING,FINAL):
        raise RuntimeError("unexpected_original_library_baseline")
    if manifest["count"]!=len(existing):
        raise RuntimeError("unverified_original_manifest_count")
    if len({s["id"] for s in existing})!=len(existing):
        raise RuntimeError("duplicate_existing_source_id")
    if len({s["sha256"] for s in existing})!=len(existing):
        raise RuntimeError("duplicate_existing_source_hash")
    if manifest["count"]==EXISTING and len(manifest.get("presets",[]))!=64:
        raise RuntimeError("baseline_four_shot_presets_incomplete")
    if manifest["count"]==FINAL and len(manifest.get("presets",[]))!=128:
        raise RuntimeError("extended_presets_incomplete")
    # Authenticate every baseline byte before adding anything else.
    for record in existing:
        physical_check(root,record,decode=False)

    if args.check_only or manifest["count"]==FINAL:
        if manifest["count"]!=FINAL:
            raise RuntimeError("not_yet_684_original_mp4_masters")
        if len({s["sha256"] for s in existing})!=FINAL:
            raise RuntimeError("duplicate_extended_master_hash")
        if len({s["id"] for s in existing})!=FINAL:
            raise RuntimeError("duplicate_extended_master_ids")
        by_id={s["id"]:s for s in existing}
        for preset in manifest["presets"]:
            ids=preset.get("clips",[])
            if len(ids)!=4 or len(set(ids))!=4 or any(
                by_id.get(clip,{}).get("theme")!=preset.get("theme") for clip in ids
            ):
                raise RuntimeError("invalid_extended_four_shot_preset")
        if args.verify:
            for rec in existing[EXISTING:]:
                physical_check(root,rec,decode=True,builder=builder)
        size=sum(
            media_file(root,s,".mp4").stat().st_size+
            media_file(root,s,".jpg").stat().st_size
            for s in existing
        )
        if size>args.max_mebibytes*1048576:
            raise RuntimeError("encoded_media_over_budget")
        if manifest.get("physicalAssetsBytes")!=size:
            raise RuntimeError("manifest_total_bytes_mismatch")
        print("verified",FINAL,"original MP4s + 44 licensed records =",PUBLIC_LIBRARY_TOTAL,
              "MP4 source records",flush=True)
        return

    apply_distinct_vector_styles(builder)
    generated=[]
    previous_ids={s["id"] for s in existing}
    old_hashes={s["sha256"] for s in existing}
    current_size=sum(
        media_file(root,s,".mp4").stat().st_size+
        media_file(root,s,".jpg").stat().st_size
        for s in existing
    )
    for index,row in enumerate(additions):
        category,topic_in_category,variant,cat,sub,topic=row
        rec=builder.generate(row,root,432,768,5,18,args.verify)
        style=style_for(category*16+topic_in_category,variant)
        if (rec["id"] in previous_ids or rec["sha256"] in old_hashes):
            raise RuntimeError("duplicate_new_motion_master_"+rec["id"])
        previous_ids.add(rec["id"])
        old_hashes.add(rec["sha256"])
        rec["visualFamily"]=style
        rec["labelsMatchOriginalAbstractArt"]=True
        rec["tags"]=list(dict.fromkeys([*rec["tags"],"original-motion-extension",style]))
        for loc in ("ru","en","es"):
            rec["label"][loc]+=" · "+STYLE_DATA[style][loc]
            rec["description"][loc]+=" · "+STYLE_DATA[style][loc]
        generated.append(rec)
        current_size+=rec["bytes"]+media_file(root,rec,".jpg").stat().st_size
        if current_size>args.max_mebibytes*1048576:
            raise RuntimeError("encoded_media_over_budget")
        if (index+1)%24==0:
            print("extended",index+1,"/",ADDITIONAL,
                  "size",round(current_size/1048576,2),"MiB",flush=True)

    all_scenes=existing+generated
    if len(all_scenes)!=FINAL or len(old_hashes)!=FINAL:
        raise RuntimeError("incomplete_unique_original_extension")
    extra_presets=[]
    for topic in range(64):
        _,_,_,cat,sub,subject=builder.scene_rows(taxonomy)[topic*5]
        prefix="motion-"+cat["id"]+"-"+subject["id"]+"-v"
        clips=[prefix+str(v) for v in (6,7,8,9)]
        by_id={s["id"]:s for s in generated}
        if any(id not in by_id for id in clips):
            raise RuntimeError("missing_new_alt_preset_clips_"+subject["id"])
        label={
            "en":subject["label"]["en"]+" — Alternative visuals",
            "ru":subject["label"]["ru"]+" — Другие образы",
            "es":subject["label"]["es"]+" — Otras imágenes",
        }
        extra_presets.append({
            "id":"motion-film-"+subject["id"]+"-alternative",
            "theme":by_id[clips[0]]["theme"],
            "label":label,
            "clips":clips,
            "sourceKind":"original_abstract_motion",
        })

    manifest.update({
        "count":FINAL,
        "status":"generated_and_technical_verified",
        "origin":"684 project-original abstract motion MP4s, plus 44 separate licensed-source MP4s",
        "physicalAssetsBytes":current_size,
        "firstWaveOriginalMasters":320,
        "secondWaveAdditionalMasters":ADDITIONAL,
        "motionMasterUniqueness":"distinct MP4 SHA256, not evidence of unique camera footage",
        "presets":[*manifest["presets"],*extra_presets],
        "scenes":all_scenes,
    })
    if len(manifest["presets"])!=128:
        raise RuntimeError("wrong_editable_preset_count")
    manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    print("built",ADDITIONAL,"new original animated MP4; combined",PUBLIC_LIBRARY_TOTAL,
          "MP4 records, unique originals",FINAL,"sizeMiB",
          round(current_size/1048576,2),flush=True)

if __name__=="__main__":
    run()
