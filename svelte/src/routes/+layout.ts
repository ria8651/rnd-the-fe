// Client-rendered SPA: no SSR, no prerender. adapter-static serves index.html as a
// fallback and the router takes over in the browser.
export const ssr = false;
export const prerender = false;
