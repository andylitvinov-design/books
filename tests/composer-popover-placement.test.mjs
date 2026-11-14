import test from 'node:test';
import assert from 'node:assert/strict';
import {positionComposerPopover} from '../lib/holistic-support/composer-popover-placement.mjs';

for(const width of [320,354,390,430]){
  test('AI plus popup stays fully visible at '+width+'px, whether button is left or right',()=>{
    for(const left of [8,width/2,width-42]){
      const input={anchor:{left,top:600,bottom:644},
        viewport:{width,height:750},contentHeight:230};
      const p=positionComposerPopover(input);
      assert.ok(p.left>=12-1 && p.left+p.width<=width-12+1,JSON.stringify(p));
      assert.ok(p.top>=12-1 && p.top+230<=750-12+1,JSON.stringify(p));
    }
  });
}
test('popup selects below when there is no space above, and above mobile keyboard otherwise',()=>{
  const below=positionComposerPopover({anchor:{left:10,top:25,bottom:69},
    viewport:{width:320,height:720},contentHeight:200});
  assert.ok(below.top>=69,'should open below top-edge anchor');
  const above=positionComposerPopover({anchor:{left:10,top:250,bottom:294},
    viewport:{width:320,height:320},contentHeight:200});
  assert.ok(above.top+200<=250,'should fit above keyboard-side anchor');
});
test('visualViewport top/left offsets are applied without horizontal overflow',()=>{
  const p=positionComposerPopover({anchor:{left:388,top:400,bottom:444},
    viewport:{width:390,height:430,offsetLeft:20,offsetTop:50},contentHeight:280});
  assert.ok(p.left>=32&&p.left+p.width<=398);
  assert.ok(p.top>=62&&p.top+280<=468);
});
