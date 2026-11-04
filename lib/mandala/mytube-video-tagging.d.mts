export type MyTubeScenarioScore={scenarioId:string;label:string;archetype:string;score:number;visualFit:number};
export type MyTubeTopicRanking={categoryId:string;subcategoryId:string;topicId:string;categoryLabel:string;subcategoryLabel:string;topicLabel:string;score:number;scenarios:MyTubeScenarioScore[]};
export type MyTubeVideoTags={
  mytubeRankings:MyTubeTopicRanking[];
  mytubeCategoryCandidates:{categoryId:string;score:number;evidence:string}[];
  mytubeCategoryIds:string[];mytubeSubcategoryIds:string[];mytubeTopicIds:string[];
  mytubeScenarioIds:string[];mytubeNeedsReview:boolean;mytubeTagMethod:string;
};
export declare function rankApprovedMyTubeScene(sceneId:string,options?:{locale?:string}):{sceneId:string;classification:string;humanReviewed:boolean;sourcePublishStatus:string;primary:MyTubeTopicRanking|null;matches:MyTubeTopicRanking[];scenarioRankingStatus:string}|null;
export declare function rankAllApprovedMyTubeScenes(scenes:ReadonlyArray<{id:string;status?:string;media?:string;label?:Record<string,string>;video?:string;poster?:string}>,options?:{locale?:string}):Array<{sceneId:string;label:string;video:string;poster:string;primary:MyTubeTopicRanking|null;matches:MyTubeTopicRanking[]}>;
export declare function rankPublicMyTubeVideo(video:{title?:string;description?:string;seriesTitle?:string;topicTags?:string[]},options?:{locale?:string}):MyTubeVideoTags;
export declare function auditMyTubeSceneTagging(scenes:ReadonlyArray<{id:string;status?:string;media?:string}>):{approvedUnique:number;ranked:number;missing:string[];primaryCategoryCounts:Record<string,number>;topicPlacements:number;scenarioVisualMatches:number;reviewStatus:string};

export type MyTubeSceneSource={id:string;status?:string;media?:string;collection?:string;rightsReference?:{kind:string};theme?:string;video?:string;tags?:readonly string[];motifs?:readonly string[];label?:Record<string,string>;poster?:string};
export type MyTubeClipCandidate={sceneId:string;score:number;topicScore:number;scenarioVisualFit:number};
export type MyTubeTopicClipSelection={
  status:"unknown_topic"|"invalid_scenario"|"invalid_media"|"insufficient_topic_media"|"four_approved_scene_candidates";
  topicId:string;scenarioId:string|null;candidateCount:number;clipIds:string[];
  candidates:MyTubeClipCandidate[];dedicatedFourSceneReady:boolean;verifiedFinishedScript?:false;
};
export declare function recommendMyTubeTopicStoryClips(input:{
  topicId:string;scenarioId?:string|null;scenes?:ReadonlyArray<MyTubeSceneSource>;
  excludedMotifs?:readonly string[];minTopicScore?:number;
}):MyTubeTopicClipSelection;
