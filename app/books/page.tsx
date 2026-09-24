import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { uiLocaleCookie } from "@/lib/ui-locale";

export default async function BooksRedirectPage() {
  const preference = (await cookies()).get(uiLocaleCookie)?.value;
  const locale = preference === "en" ? "en" : "ru";
  redirect("/" + locale + "/books");
}
