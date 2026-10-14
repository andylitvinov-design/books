import {NextResponse} from 'next/server';
export function middleware(request){
 const path=request.nextUrl.pathname;
 if(path.startsWith('/books/')&&path!=='/books/known-public'){
  const target=request.nextUrl.clone();target.pathname='/analytics-excluded-not-found';
  return NextResponse.rewrite(target);
 }
 return NextResponse.next();
}
export const config={matcher:['/books/:path*']};
