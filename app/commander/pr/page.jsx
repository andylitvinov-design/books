import './pr-timeline.css';
import PrCompletionClient from './PrCompletionClient';

export const metadata={
 title:'PR Completion · Agents Commander · Holistic House',
 robots:{index:false,follow:false,noarchive:true}
};
export default function CommanderPRPage(){
 return <PrCompletionClient/>;
}
