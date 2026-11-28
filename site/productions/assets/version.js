// Shows this site's version at the top of the page, from /version.json (written by the deploy), linking to what changed.
const a = document.querySelector('[data-role=ver]');
if (a) fetch('/version.json', { cache: 'no-store' }).then((r) => r.json()).then((v) => { a.textContent = `${v.version} \u00b7 ${v.commit} \u00b7 ${v.date} \u00b7 what changed`; a.title = 'The site version made by the deploy, its commit and date. The link lists what changed on these pages.'; }).catch(() => {});
