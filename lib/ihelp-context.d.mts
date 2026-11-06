export type IHelpLocale = "en" | "ru" | "es";
export type IHelpAction = { id: string; label: string; question: string; reply: string };
export type IHelpContext = { id: string; intro: string; otherLabel: string; actions: IHelpAction[] };
export function getIHelpContext(value?: { pathname?: string; locale?: IHelpLocale; tab?: string }): IHelpContext;
