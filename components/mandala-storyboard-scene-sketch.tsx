"use client";
import {
 Armchair,ArrowRight,BookOpen,Box,BriefcaseBusiness,CalendarDays,Camera,Car,Check,
 Clock3,CloudRain,Bus,Keyboard,Wind,Smile,Coffee,DoorOpen,FileText,Film,Flower2,Footprints,Hand,
 Handshake,Heart,House,Image as ImageIcon,KeyRound,Lamp,Landmark,Laptop,
 Luggage,Mail,Map,MessageSquare,Mountain,Music2,NotebookPen,
 Pencil,Scissors,Shirt,Smartphone,StickyNote,Sunrise,Table2,Target,
 Train,TreePine,UserRound,UsersRound,Wallet,Waves,AppWindow,Flower
} from "lucide-react";
import {describeStoryboardSceneGraphic} from "@/lib/mandala/storyboard-scene-graphic.mjs";
import css from "./mandala-storyboard-scene-sketch.module.css";

type Locale="en"|"ru"|"es";
type Props={action:string;visualSubject?:string;keywords?:readonly string[];
 locale:Locale;shotType?:string|null};
const ICONS={
 luggage:Luggage,chair:Armchair,photograph:ImageIcon,shelf:BookOpen,
 invitation:Mail,phone:Smartphone,message:MessageSquare,letter:Mail,
 notebook:NotebookPen,pencil:Pencil,paper:FileText,drawing:ImageIcon,
 box:Box,notes:StickyNote,calendar:CalendarDays,clock:Clock3,
 transit:Bus,rain:CloudRain,breath:Wind,typing:Keyboard,smile:Smile,
 money:Wallet,computer:Laptop,desk:BriefcaseBusiness,lamp:Lamp,
 light:Sunrise,door:DoorOpen,window:AppWindow,house:House,bridge:Landmark,
 train:Train,car:Car,street:Footprints,book:BookOpen,cup:Coffee,
 table:Table2,flower:Flower2,plant:Flower,tree:TreePine,
 water:Waves,mountain:Mountain,fabric:Shirt,scissors:Scissors,
 camera:Camera,food:Coffee,handshake:Handshake,heart:Heart,
 key:KeyRound,map:Map,target:Target,music:Music2,
 walking:Footprints,hands:Hand,people:UsersRound,
 meeting:UsersRound,choice:Check
};
export function MandalaStoryboardSceneSketch({action,visualSubject="",keywords=[],locale,shotType}:Props){
 const graphic=describeStoryboardSceneGraphic({action,visualSubject,keywords});
 const cues=graphic.cueIds;
 const label=locale==="ru"?"Эскиз сцены":locale==="es"?"Boceto de escena":"Scene sketch";
 const shown=cues.length>0;
 return <div className={css.sketch} role="img" aria-label={label+": "+graphic.sourceAction}
  data-storyboard-scene-sketch data-storyboard-sketch-action={graphic.sourceAction}
  data-storyboard-sketch-cues={cues.join(",")}
  data-storyboard-sketch-status={graphic.visualStatus}
  data-storyboard-sketch-shot-type={shotType||undefined}>
   <div className={css.stage} aria-hidden="true">
    {shown?<><UserRound className={css.hero} strokeWidth={1.55}/>
     <ArrowRight className={css.motion} strokeWidth={1.7}/>
     {cues.map((cue,index)=>{
      const Symbol=ICONS[cue as keyof typeof ICONS]||Film;
      return <Symbol key={cue} className={index===0?css.primary:css.secondary}
        strokeWidth={1.6}/>;
     })}
    </>:<Film className={css.unknown} strokeWidth={1.3}/>}
   </div>
   <small className={css.label}>{label}</small>
 </div>;
}
