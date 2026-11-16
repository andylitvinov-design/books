export type FreeGreetingCategory = 'fantasy'|'animals'|'people'|'spiritual'|'festive';
export type FreeGreetingCharacter =
 | 'none'|'auto'
 | 'gnome'|'fairy'|'elf'|'wizard'|'forest-spirit'|'dragon'|'mermaid'|'angel'
 | 'fox'|'cat'|'dog'|'rabbit'|'owl'|'deer'|'panda'|'dolphin'
 | 'child'|'woman'|'man'|'traveler'|'host'|'dancer'
 | 'light-guide'|'guardian'|'sage'|'yogi'
 | 'birthday-bear'|'snowman'|'heart-messenger'|'wedding-dove';
export type RenderableGreetingCharacter = Exclude<FreeGreetingCharacter,'none'|'auto'>;
export type GreetingGesture = 'wave'|'sparkle'|'flap'|'nod'|'bow'|'dance'|'namaste'|'heart';
export type GreetingLocale = 'ru'|'en'|'es';
export type GreetingCatalogEntry = Readonly<{
  id:RenderableGreetingCharacter;
  category:FreeGreetingCategory;
  emoji:string;
  gesture:GreetingGesture;
  title:Readonly<Record<GreetingLocale,string>>;
}>;
export const FREE_GREETING_CATEGORIES:readonly FreeGreetingCategory[];
export const FREE_GREETING_CATALOG: readonly GreetingCatalogEntry[];
export const FREE_GREETING_IDS:readonly FreeGreetingCharacter[];
export function recommendGreeting(sceneKey?:string,theme?:string):RenderableGreetingCharacter;
export function resolveGreetingCharacter(character:FreeGreetingCharacter,sceneKey?:string,theme?:string):FreeGreetingCharacter;
export function getGreetingCharacter(id:string):GreetingCatalogEntry|null;
