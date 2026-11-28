import {releasedReactionMedia,coachPresentationOpening} from './coach-reaction-v4-registry.mjs'

// Digest-bound provisional visual review from actual LIVE MP4 decode, 2026-11-26.
// Half-second relative detail proxy, not a perceptual proof of blur; motion
// and changes of pose affect ROI. Hold severe flags until media QA.
export const COACH_REACTION_QUALITY_REVIEW_THRESHOLD=.55
export const COACH_REACTION_QUALITY_AUDIT=Object.freeze({
 "MIR-01": {
  "sha256": "b864efd8bfa0051c09c8bf17ab516b26c45df9888c72fbef1d07f16bb3d24752",
  "ratio": 0.663,
  "at": 9.583
 },
 "MIR-02": {
  "sha256": "12afef6ff436204a320a2378e5af96ebacb7f48bcf2631dd05e17ec136a4ef88",
  "ratio": 0.525,
  "at": 0
 },
 "ALX-01": {
  "sha256": "32c24d52335509c217a12e9511f0de7aef8fc34cb24db7fc4bb3501c35c66f19",
  "ratio": 0.719,
  "at": 3.375
 },
 "ALX-02": {
  "sha256": "a7905cf92c81a92902e349920dc261c74cd9e88f617f7b1d2f42b0b14277375c",
  "ratio": 0.351,
  "at": 2.958
 },
 "SOF-01": {
  "sha256": "5986fab85aad4f13234dfeaea97f7469af2f09036067b80f5eecc51fb5b1ea91",
  "ratio": 0.357,
  "at": 3.042
 },
 "SOF-02": {
  "sha256": "36d3b1f0b688b5bc1b69e3573ede9805a9fbf26568aa56f7d203816f2ed1de35",
  "ratio": 0.691,
  "at": 1.375
 },
 "MAX-01": {
  "sha256": "b7026b3673b0ea7e12b83cd63a8c4ec1035f26da7d8f884af112dfa8abecc289",
  "ratio": 0.613,
  "at": 3.958
 },
 "MAX-02": {
  "sha256": "55aa5837f4b57f42212c7a0b41a6794450b23ae48f39e1d06794baa64452adf3",
  "ratio": 0.73,
  "at": 9.583
 },
 "MER-01": {
  "sha256": "5e0199149bcc2797c702967615931020ff7c54c0dd2f7ffc5460f80873a4fb32",
  "ratio": 0.523,
  "at": 0
 },
 "HAR-01": {
  "sha256": "b8ae194f79980a0b547a36da0fe7e11da5f4c8142b96b651d9cac82817089672",
  "ratio": 0.9,
  "at": 0
 },
 "HAR-02": {
  "sha256": "244710c91d780e4716601d87f3fc132c547ae34c881e94fc5581a1757ef1a523",
  "ratio": 0.947,
  "at": 0
 },
 "SAM-01": {
  "sha256": "8f492fb262fb4c099dd100040f8305e6a2e54a7a9da422f1c042b856f8dd67c4",
  "ratio": 0.927,
  "at": 0
 },
 "SAM-02": {
  "sha256": "505d3e08ac264b64ccd34168bc876312262a53075a83c7e41f32c0a92fb21088",
  "ratio": 0.923,
  "at": 6.083
 },
 "HAR-03A": {
  "sha256": "f25af3a780204f675768b4319fa736bc5c85b2f8be7ec7560afdec75667567f3",
  "ratio": 0.473,
  "at": 5.083
 },
 "HAR-03B": {
  "sha256": "e2294afcf4eea2e1f27c8517a1b9060f958130b4846cb0af5688814faaf5e782",
  "ratio": 0.9,
  "at": 7.792
 },
 "HAR-03C": {
  "sha256": "8f7c1a8aae0d07e7d8972caa90bb476b9ad19bc5194352b578300750d16adf41",
  "ratio": 0.666,
  "at": 8
 },
 "SAM-03A": {
  "sha256": "c2c1ae616494967e0b3203451b5bee43b254c9a245cbe33d172b8fbe338d3533",
  "ratio": 0.781,
  "at": 0.25
 },
 "SAM-03B": {
  "sha256": "b081b19a049420d137bb27013cc580495842b870bd46d7db28ad11a74b54ec40",
  "ratio": 0.789,
  "at": 0.25
 },
 "MIR-A01": {
  "sha256": "3d66bf8f978d5eb4a2c8142deef454c63290c4f48ad9a4f87d46b4a137b1e1a4",
  "ratio": 0.926,
  "at": 0.958
 },
 "MIR-A02": {
  "sha256": "b5c817cb83894cbab52b01b4b63ec6cd610ed394c32f9a42578727bf04044a2c",
  "ratio": 0.321,
  "at": 1.625
 },
 "ALX-A01": {
  "sha256": "af2805c07b425f096634b33e1ee6dda9774fec2cadd5ccfdf579fbf33f220c44",
  "ratio": 0.9,
  "at": 0.417
 },
 "ALX-A02": {
  "sha256": "06d605eae9202b7a3e3cd466037089105f2dd1162424a859ec9858ddd941751f",
  "ratio": 0.521,
  "at": 1.375
 },
 "SOF-A01": {
  "sha256": "d89d7a93281c0395e218c87f8f880d55f5bb5916e2e571765623e3d36ebd3d79",
  "ratio": 0.74,
  "at": 0.583
 },
 "SOF-A02": {
  "sha256": "27efbfad4f93cd8a36863a21aefdc5474c0b70e76b891d8cba558a9b066617bd",
  "ratio": 0.197,
  "at": 2.625
 },
 "MAX-A01": {
  "sha256": "b473aa52f9138e0d0e15acd70acf472ffbcdca4fce3b68e9c70b6c68c359cd10",
  "ratio": 0.924,
  "at": 0
 },
 "MAX-A02": {
  "sha256": "a368c2787cfca4f774324cb506889ac2149e45058429afeabcc4911d84b13633",
  "ratio": 0.265,
  "at": 1
 },
 "MER-A01": {
  "sha256": "4f794c7bfbe5e5dd7794ecf2a6be06e291425141f9b79f6708bd8396f5cd314f",
  "ratio": 0.884,
  "at": 0
 },
 "MER-A02": {
  "sha256": "e755ea48346e1a8a1cb1341a685616d35017ad934e2b4a16bc11acb198f40770",
  "ratio": 0.462,
  "at": 2.542
 },
 "HAR-A01": {
  "sha256": "f442dc82e905e888d4b86b55ccee6474f81f33a4c402d8fdd9eb75e5a2c16f09",
  "ratio": 0.953,
  "at": 0
 },
 "SAM-A01": {
  "sha256": "902925b03a6a0a15c8dabf3d0562bd165c281e2af03ae6cbdb7dad63cbe878ab",
  "ratio": 0.957,
  "at": 0
 },
 "SAM-A02": {
  "sha256": "b2bbf52d63678030d20fe01d647e53f1297a944013390dacdc78df99d8ed257f",
  "ratio": 0.947,
  "at": 0
 }
})
export function coachReactionQualityEligible(block){
 const e=block&&Object.hasOwn(COACH_REACTION_QUALITY_AUDIT,block.id)?COACH_REACTION_QUALITY_AUDIT[block.id]:null
 return Boolean(e&&e.sha256===block.sha256&&e.ratio>=COACH_REACTION_QUALITY_REVIEW_THRESHOLD&&Math.min(block.width,block.height)>=1080)
}
export function qualityScreenedReactionMedia(media){
 return media?{...media,blocks:media.blocks.filter(coachReactionQualityEligible),heldBlocks:media.blocks.filter(b=>!coachReactionQualityEligible(b))}:null
}
// MIR-01 is an existing explicit primary presence role, not a smile-only
// reaction. Temporary same-camera alternative while MIR-02 is remastered.
export function qualityScreenedPresentation(pinned,media){
 if(!pinned||!media||media.anchorHash!==pinned.anchorHash||media.group!==pinned.group)return null
 if(coachReactionQualityEligible(pinned))return pinned
 const fallback=pinned.id==='MIR-02'&&media.coach==='mira'&&media.group==='primary'?media.blocks.find(b=>b.id==='MIR-01'&&b.anchorHash===pinned.anchorHash&&coachReactionQualityEligible(b)):null
 return fallback?{...fallback,group:media.group,poster:media.poster}:null
}

// Source-verified one-shot returns: original acting remains intact; the
// new neutral alternate takes remain archived, but must not replace the
// primary camera at the end of the original welcome.
export const COACH_PUBLIC_RETURN_PLAN=Object.freeze({
 mira:Object.freeze({block:'MIR-01',presence:'MIR-01',startFrame:128,entryMae:3.027,tailDetail:.752}),
 max:Object.freeze({block:'MAX-01',presence:'MAX-01',startFrame:120,entryMae:3.576,tailDetail:.632}),
 sofia:Object.freeze({block:'SOF-01',presence:'SOF-02',startFrame:120,entryMae:4.082,tailDetail:.855}),
 alex:Object.freeze({block:'ALX-01',presence:'ALX-01',startFrame:119,entryMae:3.662,tailDetail:.783}),
 harry:Object.freeze({block:'HAR-03B',presence:'HAR-01',startFrame:79,entryMae:1.893,tailDetail:.950})
})
// Historical alternatives remain available in the full reaction inventory.
export const COACH_PUBLIC_QUALITY_PREFERENCE=Object.freeze({mira:'MIR-A01',max:'MAX-A01',alex:'ALX-A01'})
export function qualityScreenedPublicPresence(coach,released,pinned){
 if(!pinned)return null
 return qualityScreenedPresentation(pinned,releasedReactionMedia(coach,released,pinned.group))
}
export function coachPresentationReturn(coach,released,presence,opening){
 const plan=Object.hasOwn(COACH_PUBLIC_RETURN_PLAN,coach)?COACH_PUBLIC_RETURN_PLAN[coach]:null
 const original=coachPresentationOpening(coach)
 if(!plan||!original||!opening||opening.videoBlob!==original.videoBlob||opening.src!==original.src||
    !presence||presence.group!=='primary'||presence.id!==plan.presence||!coachReactionQualityEligible(presence))return null
 const media=releasedReactionMedia(coach,released,'primary')
 if(!media||media.anchorHash!==presence.anchorHash)return null
 const block=media.blocks.find(b=>b.id===plan.block)
 const audit=COACH_REACTION_QUALITY_AUDIT[plan.block]
 if(!block||!audit||block.sha256!==audit.sha256||block.anchorHash!==presence.anchorHash||
    block.width!==presence.width||block.height!==presence.height||plan.startFrame<1||plan.startFrame/24>=block.duration)return null
 // The whole SOF-01 remains held for dialogue; only the independently
 // measured good return tail is approved for the presentation.
 return {...block,id:block.id+'-return',group:media.group,poster:media.poster,startTime:plan.startFrame/24,sourceId:block.id}
}
