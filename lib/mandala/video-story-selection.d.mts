export interface EditorialVideoFilm {
 readonly signature:string;
 readonly baseSignature?:string;
 readonly creativeDirectionId?:string;
}
export interface FilmSelectionResult<T extends EditorialVideoFilm=EditorialVideoFilm>{
 readonly concept:T|null;
 readonly source:"no_brief"|"selection_missing"|"draft"|"approved"|"selected"|"default"|"undirected";
 readonly directionId:string|null;
 readonly selectionMissing:boolean;
}
export declare function isCurrentVideoFilmIntent(
 base:EditorialVideoFilm|null|undefined,candidate:EditorialVideoFilm|null|undefined
):boolean;
export declare function resolveSelectedVideoFilm<T extends EditorialVideoFilm=EditorialVideoFilm>(args?:{
 base:T|null;locale?:string;selectedDirectionId?:string|null;
 draft?:T|null;approved?:T|null;
}):FilmSelectionResult<T>;
