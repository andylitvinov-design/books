import Probe from '../probe';
export const metadata={title:'Synthetic public fixture'};
export default function Layout({children}){return <html lang="en" data-proof-root="public"><body><Probe/>{children}</body></html>;}
