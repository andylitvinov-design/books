import {findButton,nodes,textOf} from './route-pipeline-harness.mjs'

/** Advances the editor-only OPORA scenes without assuming a historical slide count.
 * The persisted authored visit-key contract remains unchanged. */
export async function advanceOporaTo(h,moment,next='Continue'){
  for(let index=0;index<26;index++){
    if(nodes(h.tree).some(node=>node.props?.['data-opora-current-screen']===moment))
      return
    // Only test navigation opts in. Production UI never silently advances.
    const consent=nodes(h.tree).find(node=>node.props?.['data-opora-first-exercise-consent']==='true')
    if(consent){
      const yes=nodes(h.tree).find(node=>node.props?.['data-opora-practice-consent-choice']==='yes')
      if(!yes||yes.props.disabled)throw Error('OPORA first exercise consent action missing')
      await yes.props.onClick()
      await h.settle()
      continue
    }
    const button=findButton(h.tree,next)
    if(!button||button.props.disabled)
      throw Error('Cannot reach OPORA '+moment+': '+textOf(h.tree).slice(0,240))
    await button.props.onClick()
    await h.settle()
  }
  throw Error('OPORA journey did not reach '+moment)
}
