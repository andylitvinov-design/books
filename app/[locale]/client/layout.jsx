import '../app/cabinet-theme.css'

// Shared assessment chrome is opt-in via the public test root. Private document
// routes do not match the theme selectors and keep their existing design.
export default function ClientLayout({children}) { return children }
