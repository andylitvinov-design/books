// Email, typed phone, Google login and a messenger-link click are not proof
// of a replyable customer-initiated Telegram or WhatsApp conversation.
// Only explicit server-side emergency rollback can restore legacy web forms.
export function websiteMessengerOnly(){return process.env.HH_WEBSITE_MESSENGER_ONLY!=="false"}
export function websiteMessengerOnlyUi(){return process.env.NEXT_PUBLIC_HH_WEBSITE_MESSENGER_ONLY!=="false"}
