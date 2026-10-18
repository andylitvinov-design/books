import { permanentRedirect } from "next/navigation";

// Short, shareable public entry point. Canonical pages retain EN/RU/ES URLs.
export default function EventsRedirect() {
  permanentRedirect("/en/events");
}
