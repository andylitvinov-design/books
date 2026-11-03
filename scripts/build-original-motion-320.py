#!/usr/bin/env python3
"""320 original abstract motion MP4s from 64 public MyTube topics.
NO STOCK footage, NO AI photorealism, NO user data, NO paid provider.
One-time GH runner only. Non-photographic vector motifs are disclosed in metadata.
"""
import argparse
import hashlib
import json
import math
import random
import shutil
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

PALETTES=[
 [('#071829','#12364b','#d7a45b'),('#142537','#3e506b','#ffe1a1'),('#151b32','#47605f','#b4bd91')],
 [('#26142f','#62415f','#d3a1a8'),('#221c36','#613b67','#f3ba89'),('#1b213d','#6d465d','#eec9b8')],
 [('#0b2930','#247776','#c8eeb6'),('#101d3b','#28667a','#e9ca74'),('#12243e','#337f87','#d8efe7')],
 [('#10172c','#34466c','#a5a8d2'),('#151b35','#485a82','#c6c7e2'),('#18252d','#455c69','#acc4c5')],
]
THEMES={'goals-money':'money','love-relationships':'relationships',
        'energy-confidence':'energy','stress-recovery':'health'}
FAMILIES=('horizon','lotus','constellation','river','portal','mountains','garden','spiral')
MOTIFS={
 'horizon':['horizon','sky','light'],'lotus':['flowers','light','abstract'],
 'constellation':['stars','light','abstract'],'river':['water','river','flow'],
 'portal':['circle','light','abstract'],'mountains':['mountain','sky','nature'],
 'garden':['garden','flowers','nature'],'spiral':['circle','light','abstract'],
}

def rgb(hex_color):
    return tuple(int(hex_color[j:j+2],16) for j in (1,3,5))
def rgba(rgb_color,alpha):
    return (*rgb_color,alpha)

def vector_art(w,h,ci,ti,v,seed,destination):
    """Eight source-independent types, 3 category palettes, seeded geometry."""
    rng=random.Random(seed)
    scale=w/540.0
    image=Image.new('RGBA',(w,h),(0,0,0,0))
    draw=ImageDraw.Draw(image,'RGBA')
    palette=PALETTES[ci][(ti+v)%3]
    dark,medium,light=map(rgb,palette)
    family=FAMILIES[(ti+3*v)%8]
    cx=w//2+int(rng.uniform(-w*.15,w*.15))
    cy=int(h*(.44+rng.uniform(-.12,.12)))
    if family in ('portal','spiral','constellation'):
        for j in range(13,0,-1):
            radius=int((48+22*j)*scale)
            if radius>min(w,h):continue
            box=(cx-radius,cy-radius,cx+radius,cy+radius)
            draw.ellipse(box,outline=rgba(light,max(3,round(24*(14-j)/13))),
                         width=max(1,round(2*scale)))
        for j in range(6):
            radius=int((35+j*35)*scale)
            draw.arc((cx-radius,cy-radius,cx+radius,cy+radius),
                     start=(seed%360+20*j),end=(seed%360+20*j+140),
                     fill=rgba(light,20+12*j),width=max(1,round(2*scale)))
    if family in ('mountains','horizon','river'):
        baseline=int(h*(.62+rng.uniform(-.1,.13)))
        for layer in range(3):
            y=baseline+layer*round(h*.09)
            vertices=[(0,h),(0,y)]
            step=max(10,round(27*scale))
            for x in range(0,w+step,step):
                yy=int(y+math.sin(x/(60*scale)+seed*.003+layer)*24*scale+
                       rng.uniform(-22,22)*scale)
                vertices.append((x,yy))
            vertices.append((w,h))
            draw.polygon(vertices,fill=rgba(dark if layer==2 else medium,
                                           (95,145,190)[layer]))
        if family=='river':
            for k in range(9):
                y=int(h*.7+k*22*scale)
                draw.arc((-w*.2,y-w*.1,w*1.2,y+w*.16),0,180,
                         fill=rgba(light,25+k*4),width=max(1,round(2*scale)))
        if family=='horizon':
            draw.ellipse((cx-45*scale,baseline-90*scale,
                          cx+45*scale,baseline),fill=rgba(light,90))
    if family in ('lotus','garden'):
        x0=w*.5
        y0=h*.59
        count=12 if family=='lotus' else 7
        for j in range(count):
            phi=j*math.tau/count+seed*.001
            radius=(112 if family=='lotus' else 182)*scale
            x=x0+math.cos(phi)*radius
            y=y0+math.sin(phi)*radius*.7
            box=(x-50*scale,y-130*scale,x+50*scale,y+65*scale)
            draw.ellipse(box,fill=rgba(light,18),outline=rgba(light,85),
                         width=max(1,round(2*scale)))
        if family=='garden':
            for _ in range(13):
                x=rng.randrange(w)
                y=rng.randrange(int(h*.35),h)
                draw.line((x,h,x+rng.randint(-80,80)*scale,y),
                          fill=rgba(medium,110),width=max(1,round(2*scale)))
                draw.ellipse((x-5*scale,y-5*scale,x+5*scale,y+5*scale),
                             fill=rgba(light,120))
    if family=='spiral':
        last=None
        for k in range(750):
            a=k*.11+seed*.001
            radius=(2+k*.2)*scale
            pos=(cx+radius*math.cos(a),cy+radius*math.sin(a))
            if last:
                draw.line((last[0],last[1],pos[0],pos[1]),
                          fill=rgba(light,90),width=max(1,round(2*scale)))
            last=pos
    for _ in range(65 if family=='constellation' else 30):
        x=rng.randrange(w)
        y=rng.randrange(max(1,int(h*.8)))
        radius=rng.choice([1,1,2,3])*scale
        draw.ellipse((x-radius,y-radius,x+radius,y+radius),
                     fill=rgba(light,rng.randint(45,160)))
    blurred=image.filter(ImageFilter.GaussianBlur(max(2,round(14*scale))))
    blurred.putalpha(blurred.getchannel('A').point(lambda alpha:round(alpha*.45)))
    Image.alpha_composite(blurred,image).save(destination,optimize=True)
    return family,palette

def command(args,timeout=75,output=False):
    r=subprocess.run(args,stdout=subprocess.PIPE if output else subprocess.DEVNULL,
                     stderr=subprocess.PIPE,timeout=timeout)
    if r.returncode:
        raise RuntimeError('media command failed: '+r.stderr.decode(errors='replace')[-600:])
    return r.stdout if output else b''

def media_proof(movie,poster,w,h,seconds,fps,check_motion):
    import hashlib
    raw=command(['ffprobe','-v','error','-show_entries',
                 'stream=codec_type,codec_name,width,height,avg_frame_rate:format=duration',
                 '-of','json',str(movie)],15,True)
    probe=json.loads(raw)
    video=next((a for a in probe.get('streams',[]) if a.get('codec_type')=='video'),{})
    if (video.get('codec_name')!='h264' or video.get('width')!=w or
            video.get('height')!=h or not poster.is_file() or
            poster.stat().st_size<1000 or not 4.8<float(probe['format']['duration'])<5.2):
        raise RuntimeError('invalid physical media: '+movie.name)
    if check_motion:
        plane=48*80
        samples=command(['ffmpeg','-hide_banner','-loglevel','error','-nostdin',
                         '-i',str(movie),'-vf','fps=1,scale=48:80,format=gray',
                         '-frames:v','5','-pix_fmt','gray','-f','rawvideo','pipe:1'],30,True)
        if len(samples)<4*plane or samples[:plane]==samples[-plane:]:
            raise RuntimeError('no decoded motion: '+movie.name)
    return hashlib.sha256(movie.read_bytes()).hexdigest()

def scene_rows(taxonomy):
    cats=taxonomy.get('categories',[])
    if len(cats)!=4:raise RuntimeError('expected 4 editorial categories')
    out=[]
    for ci,cat in enumerate(cats):
        if cat['id'] not in THEMES or len(cat.get('subcategories',[]))!=4:
            raise RuntimeError('unexpected category or subcategories')
        topic_idx=0
        for sub in cat['subcategories']:
            if len(sub.get('topics',[]))!=4:raise RuntimeError('expected 4 topics')
            for topic in sub['topics']:
                for v in range(5):
                    out.append((ci,topic_idx,v,cat,sub,topic))
                topic_idx+=1
        if topic_idx!=16:raise RuntimeError('expected 16 topics per category')
    if len(out)!=320:raise RuntimeError('expected 320 source scenes')
    return out

def generate(row,root,w,h,seconds,fps,verify):
    ci,ti,v,cat,sub,topic=row
    id='motion-'+cat['id']+'-'+topic['id']+'-v'+str(v+1)
    seed=int(hashlib.sha256(id.encode()).hexdigest()[:12],16)
    folder=root/'public/videos/holistic-house/original-motion-v1'
    output=folder/(id+'.mp4')
    poster=folder/(id+'.jpg')
    art=root/'artifacts/original-motion-drafts'/(id+'.png')
    folder.mkdir(parents=True,exist_ok=True)
    art.parent.mkdir(parents=True,exist_ok=True)
    family,palette=vector_art(w,h,ci,ti,v,seed,art)
    speed=.013+(seed%13)*.0007
    source=('gradients=s='+str(w)+'x'+str(h)+':r='+str(fps)+
            ':c0='+palette[0]+':c1='+palette[1]+':c2='+palette[2]+
            ':n=3:t='+str(seed%5)+':speed='+str(speed)+':d='+str(seconds))
    graph=('[0:v]format=rgba[bg];[1:v]format=rgba[fg];'
           '[bg][fg]overlay=x=7*sin(t/2.4):y=7*cos(t/2.7):shortest=1,format=yuv420p[out]')
    command(['ffmpeg','-hide_banner','-loglevel','error','-nostdin','-y',
             '-f','lavfi','-i',source,'-loop','1','-framerate',str(fps),'-i',str(art),
             '-filter_complex',graph,'-map','[out]','-t',str(seconds),'-an',
             '-c:v','libx264','-preset','ultrafast','-crf','32','-threads','2',
             '-movflags','+faststart',str(output)])
    command(['ffmpeg','-hide_banner','-loglevel','error','-nostdin','-y',
             '-ss','2','-i',str(output),'-frames:v','1','-q:v','4',str(poster)],30)
    digest=media_proof(output,poster,w,h,seconds,fps,verify)
    topic_labels=topic.get('label',{})
    translated={
        'en':'Original abstract motion: '+topic_labels.get('en',topic['id']),
        'ru':'Оригинальная анимация: '+topic_labels.get('ru',topic['id']),
        'es':'Animación abstracta: '+topic_labels.get('es',topic['id']),
    }
    return {'id':id,'theme':THEMES[cat['id']],'collection':'original-motion-v1',
            'media':'original_motion_mp4','status':'approved',
            'video':'/videos/holistic-house/original-motion-v1/'+id+'.mp4',
            'poster':'/videos/holistic-house/original-motion-v1/'+id+'.jpg',
            'label':translated,'description':translated,
            'categories':[THEMES[cat['id']],cat['id'],sub['id']],
            'tags':[topic['id'],cat['id'],family,'motion','abstract'],
            'motifs':MOTIFS[family],'pace':'slow',
            'rightsReference':{'kind':'project_generated_original',
                              'creator':'Holistic House','thirdPartyFootage':False},
            'visualOrigin':'original_procedural_non_photographic',
            'sourceId':topic['id'],'durationSeconds':seconds,'width':w,
            'height':h,'fps':fps,'bytes':output.stat().st_size,
            'sha256':digest,'seed':seed}

def run():
    p=argparse.ArgumentParser()
    p.add_argument('--root',type=Path,default=Path(__file__).resolve().parent.parent)
    p.add_argument('--verify',action='store_true')
    p.add_argument('--check-only',action='store_true')
    p.add_argument('--max-mebibytes',type=int,default=65)
    a=p.parse_args()
    root=a.root.resolve()
    dest=root/'data/video-catalog/original-motion-scenes-v1.json'
    width,height,seconds,fps=432,768,5,18
    taxonomy=json.loads((root/'data/video-catalog/mytube-content-taxonomy-4x4x4-v1.json').read_text())
    rows=scene_rows(taxonomy)
    if not shutil.which('ffmpeg') or not shutil.which('ffprobe'):
        raise RuntimeError('ffmpeg and ffprobe are required')
    if a.check_only:
        existing=json.loads(dest.read_text())
        scenes=existing['scenes']
        if len(scenes)!=320 or existing['count']!=320:
            raise RuntimeError('not 320 physical scenes')
        for scene in scenes:
            name=scene['id']
            folder=root/'public/videos/holistic-house/original-motion-v1'
            movie=folder/(name+'.mp4')
            poster=folder/(name+'.jpg')
            if media_proof(movie,poster,width,height,seconds,fps,a.verify)!=scene['sha256']:
                raise RuntimeError('sha256 mismatch: '+name)
        if len({s['sha256'] for s in scenes})!=320:
            raise RuntimeError('duplicate encoded masters')
        print('verified 320 unique original MP4 files',flush=True)
        return
    scenes=[]
    total=0
    for index,row in enumerate(rows):
        item=generate(row,root,width,height,seconds,fps,a.verify)
        scenes.append(item)
        total+=item['bytes']+(root/'public'/item['poster'].lstrip('/')).stat().st_size
        if total>a.max_mebibytes*1024*1024:
            raise RuntimeError('total encoded assets exceed budget; no publication')
        if (index+1)%20==0:
            print('rendered',index+1,'/ 320; total MB',round(total/1048576,2),flush=True)
    if len({s['sha256'] for s in scenes})!=320:
        raise RuntimeError('duplicate encoded video masters')
    presets=[]
    for index in range(0,320,5):
        original=rows[index]
        cat=original[3]
        topic=original[5]
        presets.append({
            'id':'motion-film-'+topic['id'],
            'theme':THEMES[cat['id']],
            'label':topic['label'],
            'clips':[s['id'] for s in scenes[index:index+4]],
            'sourceKind':'original_abstract_motion'
        })
    body={'schemaVersion':'hh-original-motion-v1','count':320,
          'status':'generated_and_technical_verified',
          'origin':'320 project-original procedural abstract MP4s, not stock footage',
          'physicalAssetsBytes':total,'presets':presets,'scenes':scenes}
    dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text(json.dumps(body,ensure_ascii=False,indent=2)+'\n')
    print('completed 320 real MP4s in',round(total/1048576,2),'MiB',flush=True)

if __name__=='__main__':
    run()
