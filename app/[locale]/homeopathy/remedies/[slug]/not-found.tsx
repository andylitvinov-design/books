import Link from "next/link";

export default function RemedyNotFound() {
  return <main className="homeopathy-shell"><section className="remedy-empty"><p className="homeopathy-kicker">Homeopathy</p><h1>Remedy not found</h1><p>The requested remedy is not one of the confirmed source entries.</p><Link href="/ru/homeopathy/remedies">← Remedy directory</Link></section></main>;
}
