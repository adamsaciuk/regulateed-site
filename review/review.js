// RegulateED review layer: a password screen, then pins and comments on any
// review page. Added to each page by tools/publish-site.ts, which also writes
// window.REVIEW = { page, title, api, passHash } just before this script.
// Plain browser JavaScript: the pages are static and have no build step.
(function () {
    'use strict';
    const CFG = window.REVIEW || {};
    const PASS_KEY = 'rv-pass';
    const NAME_KEY = 'rv-name';
    const QUEUE_KEY = 'rv-queue-' + (CFG.page || 'index');
    const html = document.documentElement;

    const sha256 = async (s) => {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
        return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
    };
    const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    const h = (tag, attrs, ...kids) => {
        const e = document.createElement(tag);
        for (const [k, v] of Object.entries(attrs || {})) {
            if (k === 'class') e.className = v;
            else if (k === 'html') e.innerHTML = v;
            else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
            else e.setAttribute(k, v);
        }
        for (const kid of kids) if (kid != null) e.append(kid);
        return e;
    };

    // ---------------------------------------------------------------- styles
    document.head.append(h('style', {}, `
        @font-face { font-family: "RegulateED Open Sans"; font-weight: 400; src: url("../fonts/open-sans-latin-400.woff2") format("woff2"); }
        @font-face { font-family: "RegulateED Open Sans"; font-weight: 600; src: url("../fonts/open-sans-latin-600.woff2") format("woff2"); }
        @font-face { font-family: "RegulateED Open Sans"; font-weight: 700; src: url("../fonts/open-sans-latin-700.woff2") format("woff2"); }
        @font-face { font-family: "RegulateED Open Sans"; font-weight: 800; src: url("../fonts/open-sans-latin-800.woff2") format("woff2"); }
        #rv-gate { position: fixed; inset: 0; z-index: 9999; visibility: visible; overflow: auto; font-family: "RegulateED Open Sans", "Open Sans", system-ui, sans-serif; color: #1F3A4D;
            background: radial-gradient(1200px 700px at 12% -10%, rgba(127,211,198,.20), transparent 60%), radial-gradient(900px 600px at 105% 110%, rgba(242,132,92,.18), transparent 60%), #1F3A4D; }
        #rv-gate * { box-sizing: border-box; }
        #rv-gate { overflow-x: hidden; }
        #rv-gate .rv-watermark path, #rv-gate .rv-watermark circle { stroke: #7FD3C6; }
        #rv-gate .rv-watermark { position: absolute; right: -14vmin; bottom: -18vmin; width: 70vmin; opacity: .07; pointer-events: none; }
        #rv-gate .rv-stage { position: relative; min-height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 20px 24px; }
        #rv-gate .rv-hero { width: 104px; margin-bottom: -26px; position: relative; z-index: 1; }
        #rv-gate .rv-reggie { display: block; width: 100%; overflow: visible; }
        #rv-gate .rv-reggie * { transform-box: view-box; }
        #rv-gate .rv-float { animation: rvbreathe 4s ease-in-out infinite; transform-origin: 50px 88px; }
        #rv-gate .rv-shadow { animation: rvshadow 4s ease-in-out infinite; transform-origin: 50px 95px; }
        #rv-gate .rv-sprout { animation: rvsway 3s ease-in-out infinite; transform-origin: 50px 18px; }
        #rv-gate.rv-open .rv-float { animation: rvhop .5s cubic-bezier(.3,.7,.4,1) 1; }
        #rv-gate.rv-open { animation: rvfade .52s ease-in forwards; }
        #rv-gate .rv-card { width: min(420px, 100%); background: #FFF8F0; border-radius: 24px; padding: 40px 34px 26px; box-shadow: 0 24px 60px rgba(0,0,0,.28), 0 2px 0 rgba(255,255,255,.6) inset; text-align: left; }
        #rv-gate .rv-card.rv-bad { animation: rvshake .4s ease-in-out 1; }
        #rv-gate .rv-lockup { display: block; width: 220px; margin: 0 auto; }
        #rv-gate .rv-rule { height: 1px; background: #E9E1D6; margin: 20px 0 18px; }
        #rv-gate .rv-eyebrow { font-size: 12px; font-weight: 800; letter-spacing: 2.6px; text-transform: uppercase; color: #2A9D8F; margin: 0 0 4px; }
        #rv-gate h1 { font-size: 24px; line-height: 1.2; font-weight: 800; margin: 0 0 8px; letter-spacing: -.2px; }
        #rv-gate .rv-lede { font-size: 15px; line-height: 1.5; margin: 0 0 20px; color: #4A5E6D; }
        #rv-gate label { display: block; font-size: 13px; font-weight: 700; margin: 0 0 6px; }
        #rv-gate .rv-field { display: flex; align-items: center; width: 100%; background: #fff; border: 2px solid #E9E1D6; border-radius: 14px; transition: border-color .15s, box-shadow .15s; }
        #rv-gate .rv-field:focus-within { border-color: #2A9D8F; box-shadow: 0 0 0 4px rgba(42,157,143,.16); }
        #rv-gate .rv-bad .rv-field { border-color: #D9534F; box-shadow: 0 0 0 4px rgba(217,83,79,.14); }
        #rv-gate input { flex: 1; min-width: 0; width: 100%; font: inherit; font-size: 17px; color: #1F3A4D; background: transparent; border: 0; outline: 0; padding: 13px 14px; }
        #rv-gate .rv-show { flex: none; font: inherit; font-size: 13px; font-weight: 700; color: #2A9D8F; background: none; border: 0; padding: 8px 14px; cursor: pointer; }
        #rv-gate .rv-go { display: block; width: 100%; margin-top: 14px; font: inherit; font-weight: 800; font-size: 16px; letter-spacing: .2px; padding: 14px; border: 0; border-radius: 40px; background: #2A9D8F; color: #fff; cursor: pointer; box-shadow: 0 8px 18px rgba(42,157,143,.32); transition: transform .12s, background .15s; }
        #rv-gate .rv-go:hover { background: #24897D; }
        #rv-gate .rv-go:active { transform: translateY(1px); }
        #rv-gate .rv-err { min-height: 22px; margin: 10px 0 0; font-size: 14px; font-weight: 700; color: #C0392B; text-align: center; }
        #rv-gate footer { background: none; padding: 0; margin-top: 22px; max-width: 420px; text-align: center; color: rgba(255,255,255,.72); font-size: 13px; line-height: 1.6; }
        #rv-gate footer b { display: block; color: #fff; font-size: 15px; font-weight: 700; }
        @keyframes rvbreathe { 0%, 100% { transform: translateY(0) scale(1, 1); } 50% { transform: translateY(-5px) scale(1.03, .98); } }
        @keyframes rvshadow { 0%, 100% { transform: scale(1); opacity: .3; } 50% { transform: scale(.85); opacity: .2; } }
        @keyframes rvsway { 0%, 100% { transform: rotate(-7deg); } 50% { transform: rotate(7deg); } }
        @keyframes rvhop { 0% { transform: translateY(0); } 40% { transform: translateY(-20px); } 100% { transform: translateY(0); } }
        @keyframes rvfade { 60% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes rvshake { 20%, 60% { transform: translateX(-8px); } 40%, 80% { transform: translateX(8px); } }
        @media (prefers-reduced-motion: reduce) { #rv-gate *, #rv-gate { animation: none !important; } }
        @media (max-width: 420px) { #rv-gate .rv-card { padding: 34px 22px 22px; } #rv-gate .rv-lockup { width: 190px; } }
        .rv-ui { font-family: "Open Sans", system-ui, sans-serif; color: #1F3A4D; }
        #rv-bar { position: fixed; right: 18px; bottom: 18px; z-index: 9000; display: flex; gap: 8px; }
        #rv-bar button { font: inherit; font-weight: 800; border: 0; border-radius: 40px; padding: 12px 18px; cursor: pointer; box-shadow: 0 6px 18px rgba(31,58,77,.25); }
        #rv-bar .add { background: #F2845C; color: #fff; }
        #rv-bar .add.on { background: #1F3A4D; }
        #rv-bar .list { background: #fff; color: #1F3A4D; }
        #rv-bar .lock { background: #fff; color: #1F3A4D; }
        #rv-hello { position: fixed; left: 50%; top: 78px; transform: translateX(-50%); z-index: 9150; display: flex; align-items: center; gap: 10px; background: #fff; border: 2px solid #F2845C; border-radius: 40px; padding: 8px 10px 8px 14px; box-shadow: 0 10px 28px rgba(31,58,77,.25); font-weight: 700; font-size: 15px; max-width: calc(100vw - 20px); animation: rvhello .4s ease-out; }
        #rv-hello .rv-avatar svg { width: 26px; height: 26px; margin: 0; }
        #rv-hello .go { font: inherit; font-weight: 800; background: #F2845C; color: #fff; border: 0; border-radius: 30px; padding: 7px 14px; cursor: pointer; white-space: nowrap; }
        #rv-hello .x { font: inherit; font-size: 20px; background: none; border: 0; color: #8A97A1; cursor: pointer; padding: 0 4px; }
        @keyframes rvhello { from { opacity: 0; transform: translate(-50%, -10px); } to { opacity: 1; transform: translate(-50%, 0); } }
        .rv-c.iris { background: #EEF8F6; border-radius: 10px; padding: 8px 10px; margin: 6px 0; border-bottom: 0; }
        .rv-c.fresh { box-shadow: inset 3px 0 0 #F2845C; }
        .rv-avatar svg { width: 22px; height: 22px; vertical-align: -6px; margin-right: 6px; }
        .rv-team { font-size: 11px; font-weight: 800; color: #2A9D8F; margin-left: 6px; text-transform: uppercase; letter-spacing: .6px; }
        .rv-closed { margin-top: 8px; font-size: 12px; font-weight: 800; color: #2A9D8F; text-transform: uppercase; letter-spacing: 1px; }
        .rv-new { display: inline-block; margin-left: 8px; background: #F2845C; color: #fff; border-radius: 20px; padding: 1px 8px; font-size: 12px; font-weight: 800; }
        .rv-pin.unread::after { content: ""; position: absolute; top: -5px; right: -5px; width: 12px; height: 12px; border-radius: 50%; background: #E0524B; border: 2px solid #fff; }
        #rv-panel .who { font-size: 13px; color: #4A5E6D; margin: 4px 2px 6px; }
        #rv-panel .who button { font: inherit; font-weight: 700; color: #2A9D8F; background: none; border: 0; cursor: pointer; padding: 0 4px; }
        .rv-pin.carried { background: #fff; color: #E0703F; border: 2px solid #F2845C; font-size: 11px; }
        .rv-pin.moved { border-style: dashed; }
        .rv-from { background: #FFF4EC; border: 1px solid #F8D5C2; border-radius: 10px; padding: 8px 10px; margin-bottom: 8px; font-size: 13px; line-height: 1.4; }
        .rv-from a { color: #2A9D8F; font-weight: 800; }
        #rv-panel .item.carried .n { background: #fff; color: #E0703F; border: 2px solid #F2845C; width: auto; padding: 0 6px; border-radius: 12px; }
        #rv-panel .item .from { display: inline-block; margin-left: 6px; font-size: 11px; font-weight: 800; color: #E0703F; text-transform: uppercase; letter-spacing: .6px; }
        #rv-archived { position: relative; z-index: 8500; background: #FFF4EC; color: #1F3A4D; border-bottom: 2px solid #F2845C; padding: 10px 16px; font-size: 14px; text-align: center; }
        #rv-archived a { color: #2A9D8F; font-weight: 800; }
        #rv-bar .draw { background: #2A9D8F; color: #fff; }
        html.rv-drawing, html.rv-drawing body { overflow: hidden; overscroll-behavior: none; }
        html.rv-drawing #rv-bar, html.rv-drawing #rv-pins { display: none; }
        #rv-canvas { position: fixed; left: 0; top: 0; width: 100vw; height: 100vh; z-index: 9300; touch-action: none; cursor: crosshair; background: rgba(31,58,77,.04); }
        #rv-drawbar { position: fixed; left: 50%; bottom: 18px; transform: translateX(-50%); z-index: 9400; display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid #E9E1D6; border-radius: 40px; padding: 8px 10px; box-shadow: 0 10px 28px rgba(31,58,77,.28); max-width: calc(100vw - 16px); }
        #rv-drawbar .sw { width: 30px; height: 30px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 0 1px #E9E1D6; cursor: pointer; padding: 0; flex: none; }
        #rv-drawbar .sw.on { box-shadow: 0 0 0 3px #1F3A4D; }
        #rv-drawbar .gap { width: 4px; }
        #rv-drawbar button:not(.sw) { font: inherit; font-weight: 700; font-size: 14px; border: 1px solid #E9E1D6; background: #fff; border-radius: 30px; padding: 8px 13px; cursor: pointer; white-space: nowrap; }
        #rv-drawbar button.main { background: #1F3A4D; border-color: #1F3A4D; color: #fff; }
        .rv-pop .rv-shot, .rv-c .rv-shot { display: block; width: 100%; border-radius: 10px; border: 1px solid #E9E1D6; margin: 0 0 10px; cursor: zoom-in; }
        .rv-c .rv-shot { margin: 8px 0 0; }
        #rv-lightbox { position: fixed; inset: 0; z-index: 9600; background: rgba(15,28,38,.88); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 20px; cursor: zoom-out; }
        #rv-lightbox img { max-width: 100%; max-height: calc(100vh - 70px); border-radius: 12px; box-shadow: 0 20px 50px rgba(0,0,0,.5); }
        #rv-lightbox span { color: rgba(255,255,255,.75); font-size: 14px; font-weight: 700; }
        .rv-toplink { flex: none; font-weight: 800; font-size: 14px; text-decoration: none; color: #1F3A4D !important; background: #FFF8F0; border-radius: 40px; padding: 8px 14px; white-space: nowrap; }
        .rv-toplink:hover { background: #fff; }
        @media (max-width: 640px) { .rv-toplink { font-size: 13px; padding: 7px 10px; } }
        #rv-lockask { position: fixed; right: 18px; bottom: 78px; z-index: 9200; width: min(320px, calc(100vw - 24px)); background: #fff; border: 1px solid #E9E1D6; border-radius: 16px; box-shadow: 0 12px 32px rgba(31,58,77,.25); padding: 16px; font-size: 15px; line-height: 1.45; }
        #rv-lockask p { margin: 4px 0 12px; color: #4A5E6D; }
        #rv-lockask .row { display: flex; gap: 8px; justify-content: flex-end; }
        #rv-lockask button { font: inherit; font-weight: 700; border: 1px solid #E9E1D6; background: #fff; border-radius: 30px; padding: 8px 16px; cursor: pointer; }
        #rv-lockask button.main { background: #1F3A4D; border-color: #1F3A4D; color: #fff; }
        #rv-bar .all { font-weight: 800; text-decoration: none; border-radius: 40px; padding: 12px 18px; background: #1F3A4D; color: #fff; box-shadow: 0 6px 18px rgba(31,58,77,.25); white-space: nowrap; }
        @media (max-width: 520px) { #rv-bar { left: 12px; right: 12px; bottom: 12px; justify-content: center; } #rv-bar button, #rv-bar .all { padding: 11px 13px; font-size: 14px; } }
        #rv-banner { position: fixed; left: 50%; top: 72px; transform: translateX(-50%); z-index: 9000; background: #1F3A4D; color: #fff; padding: 10px 18px; border-radius: 40px; font-weight: 700; font-size: 15px; display: none; max-width: 92vw; text-align: center; }
        #rv-banner.show { display: block; }
        #rv-banner.off { background: #C0392B; }
        html.rv-placing, html.rv-placing * { cursor: crosshair !important; }
        #rv-pins { position: absolute; left: 0; top: 0; width: 0; height: 0; z-index: 8000; }
        .rv-pin { position: absolute; width: 30px; height: 30px; margin: -30px 0 0 -4px; border-radius: 50% 50% 50% 0; background: #F2845C; color: #fff; font: 800 13px/30px "Open Sans", system-ui, sans-serif; text-align: center; border: 2px solid #fff; box-shadow: 0 3px 10px rgba(31,58,77,.35); cursor: pointer; padding: 0; }
        .rv-pin span { display: inline-block; }
        .rv-pin.flash { animation: rvflash 1s ease-in-out 2; }
        .rv-pin.pending { background: #8AA6B8; }
        @keyframes rvflash { 50% { transform: scale(1.5); } }
        .rv-pop { position: absolute; z-index: 9100; width: min(340px, 90vw); background: #fff; border: 1px solid #E9E1D6; border-radius: 16px; box-shadow: 0 12px 32px rgba(31,58,77,.25); padding: 14px; font-size: 15px; line-height: 1.45; }
        .rv-pop textarea, .rv-pop input { width: 100%; font: inherit; border: 2px solid #E9E1D6; border-radius: 10px; padding: 8px 10px; box-sizing: border-box; }
        .rv-pop textarea { min-height: 84px; resize: vertical; }
        .rv-pop .row { display: flex; gap: 8px; justify-content: flex-end; margin-top: 10px; }
        .rv-pop button { font: inherit; font-weight: 700; border: 1px solid #E9E1D6; background: #fff; border-radius: 30px; padding: 7px 14px; cursor: pointer; }
        .rv-pop button.main { background: #2A9D8F; border-color: #2A9D8F; color: #fff; }
        .rv-c { padding: 8px 0; border-bottom: 1px solid #F1EBE2; }
        .rv-c:last-of-type { border-bottom: 0; }
        .rv-c b { font-size: 14px; }
        .rv-c time { font-size: 12px; opacity: .6; margin-left: 6px; }
        .rv-c p { margin: 3px 0 0; white-space: pre-wrap; }
        .rv-c.reply { margin-left: 16px; }
        #rv-panel { position: fixed; top: 0; right: 0; bottom: 0; width: min(380px, 92vw); z-index: 9050; background: #FFF8F0; border-left: 1px solid #E9E1D6; box-shadow: -10px 0 30px rgba(31,58,77,.18); transform: translateX(105%); transition: transform .2s; display: flex; flex-direction: column; }
        #rv-panel.open { transform: none; }
        #rv-panel header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: #1F3A4D; color: #fff; font-weight: 800; }
        #rv-panel header button { font: inherit; background: none; border: 0; color: #fff; font-size: 22px; cursor: pointer; }
        #rv-panel .body { overflow: auto; padding: 10px 14px 90px; }
        #rv-panel .grp { font-size: 12px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase; color: #2A9D8F; margin: 14px 0 6px; }
        #rv-panel .item { display: block; width: 100%; text-align: left; font: inherit; background: #fff; border: 1px solid #E9E1D6; border-radius: 12px; padding: 10px 12px; margin-bottom: 8px; cursor: pointer; }
        #rv-panel .item.done { opacity: .5; }
        #rv-panel .item .n { display: inline-grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; background: #F2845C; color: #fff; font-size: 12px; font-weight: 800; margin-right: 6px; }
        #rv-panel .empty { opacity: .7; padding: 12px 2px; }
    `));

    // ------------------------------------------------------------------ gate
    // The brand's own artwork, as on the holding page: the reset wave lockup and Reggie.
    const WAVE = '<circle cx="50" cy="50" r="44" fill="none" stroke-width="4" stroke="rgba(42,157,143,.28)"/>'
        + '<path d="M14 50 L20 37 L26 62 L32 40 L38 58 L44 50" fill="none" stroke="#F2845C" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>'
        + '<path d="M44 50 C51 37 58 37 65 50 S79 63 86 50" fill="none" stroke="#2A9D8F" stroke-width="7" stroke-linecap="round"/>';
    const LOCKUP = `<svg class="rv-lockup" viewBox="0 0 360 100" role="img" aria-label="RegulateED, classroom self-regulation">${WAVE}`
        + '<text x="114" y="60" style="font:800 40px \'RegulateED Open Sans\',sans-serif;letter-spacing:-.5px;fill:#1F3A4D">RegulateED</text>'
        + '<text x="116" y="82" style="font:600 10.5px \'RegulateED Open Sans\',sans-serif;letter-spacing:2.2px;fill:#1F3A4D;opacity:.65">CLASSROOM SELF-REGULATION</text></svg>';
    const REGGIE = '<svg class="rv-reggie" viewBox="0 0 100 100" role="img" aria-label="Reggie">'
        + '<ellipse class="rv-shadow" cx="50" cy="95" rx="24" ry="3.5" fill="#000" opacity=".3"/>'
        + '<g class="rv-float"><g class="rv-body">'
        + '<g class="rv-sprout"><path d="M50 18 C50 11 54 7 60 6" fill="none" stroke="#7FD3C6" stroke-width="4" stroke-linecap="round"/><circle cx="61" cy="6" r="3.5" fill="#F7A27F"/></g>'
        + '<path d="M50 18 C73 18 86 34 86 56 C86 77 70 88 50 88 C30 88 14 77 14 56 C14 34 27 18 50 18 Z" fill="#7FD3C6"/>'
        + '<path d="M33 52 Q39 46 45 52 M55 52 Q61 46 67 52" fill="none" stroke="#1F3A4D" stroke-width="4" stroke-linecap="round"/>'
        + '<path d="M43 64 Q50 70 57 64" fill="none" stroke="#1F3A4D" stroke-width="4" stroke-linecap="round"/>'
        + '<circle cx="33" cy="62" r="4.5" fill="#F7A27F" opacity=".85"/><circle cx="67" cy="62" r="4.5" fill="#F7A27F" opacity=".85"/>'
        + '</g></g></svg>';

    // Locking is deliberate (Adam): tap Lock, then confirm. It forgets the password on this device only.
    const lockBtn = h('button', { class: 'lock', title: 'Lock this device behind the password' }, 'Lock');
    lockBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        document.getElementById('rv-lockask')?.remove();
        const ask = h('div', { id: 'rv-lockask', class: 'rv-ui' },
            h('b', {}, 'Lock this device?'),
            h('p', {}, 'The review password will be needed again to open these pages here.'),
            h('div', { class: 'row' },
                h('button', { onclick: () => ask.remove() }, 'Cancel'),
                h('button', { class: 'main', onclick: () => { localStorage.removeItem(PASS_KEY); location.reload(); } }, 'Lock now')));
        document.body.append(ask);
    });

    const unlock = () => {
        html.classList.remove('rv-locked');
        document.getElementById('rv-gate')?.remove();
        // An archived version says so, and leads to the current one from its own top bar.
        const top = CFG.page && CFG.nav && CFG.nav.top && document.querySelector('header .in');
        if (top) top.insertBefore(h('a', { class: 'rv-ui rv-toplink', href: CFG.nav.top.href }, CFG.nav.top.label), top.children[1] || null);
        if (CFG.archived) {
            document.body.prepend(h('div', { id: 'rv-archived', class: 'rv-ui' },
                h('b', {}, `Archived: ${CFG.tag || CFG.title}`), ` frozen ${CFG.frozen || ''}. Comments here stay exactly where they were made. `,
                h('a', { href: CFG.currentHref || 'index.html' }, 'Open the current workflow →')));
        }
        if (CFG.page) startPins();
        else document.body.append(h('div', { id: 'rv-bar', class: 'rv-ui' }, lockBtn));
    };
    const gate = async () => {
        const saved = localStorage.getItem(PASS_KEY);
        if (saved && await sha256(saved) === CFG.passHash) { unlock(); return; }
        const wrap = h('div', { id: 'rv-gate', role: 'dialog', 'aria-label': 'RegulateED team review' });
        wrap.innerHTML = `
            <svg class="rv-watermark" viewBox="0 0 100 100" aria-hidden="true">${WAVE}</svg>
            <div class="rv-stage">
                <div class="rv-hero">${REGGIE}</div>
                <form class="rv-card" novalidate>
                    ${LOCKUP}
                    <div class="rv-rule"></div>
                    <div class="rv-eyebrow">Team review</div>
                    <h1>${CFG.page ? esc(CFG.title || 'RegulateED review') : 'Welcome to the review'}</h1>
                    <p class="rv-lede">Private preview pages for the RegulateED team. Enter the review password to continue.</p>
                    <label for="rv-pass">Review password</label>
                    <div class="rv-field">
                        <input id="rv-pass" type="password" autocomplete="current-password" spellcheck="false" autocapitalize="off">
                        <button type="button" class="rv-show" aria-label="Show password">Show</button>
                    </div>
                    <button type="submit" class="rv-go">Open review</button>
                    <p class="rv-err" role="alert"></p>
                </form>
                <footer><b>Calm in two minutes. Ready to learn.</b><span>&copy; 2026 RegulateED &middot; Please keep this link within the team.</span></footer>
            </div>`;
        document.body.append(wrap);
        const form = wrap.querySelector('form');
        const input = wrap.querySelector('#rv-pass');
        const err = wrap.querySelector('.rv-err');
        const show = wrap.querySelector('.rv-show');
        show.addEventListener('click', () => {
            const hidden = input.type === 'password';
            input.type = hidden ? 'text' : 'password';
            show.textContent = hidden ? 'Hide' : 'Show';
            input.focus();
        });
        input.addEventListener('input', () => { err.textContent = ''; form.classList.remove('rv-bad'); });
        form.addEventListener('submit', async (ev) => {
            ev.preventDefault();
            if (input.value && await sha256(input.value) === CFG.passHash) {
                localStorage.setItem(PASS_KEY, input.value);
                wrap.classList.add('rv-open');
                setTimeout(unlock, 520);
                return;
            }
            err.textContent = input.value ? 'That password is not right. Please try again.' : 'Please enter the review password.';
            form.classList.remove('rv-bad');
            void form.offsetWidth;
            form.classList.add('rv-bad');
            input.select();
        });
        input.focus();
    };

    // ------------------------------------------------------------------ pins
    let comments = [];
    let placing = false;
    let greeted = false;
    let online = true;
    const pins = h('div', { id: 'rv-pins', class: 'rv-ui' });
    const banner = h('div', { id: 'rv-banner', class: 'rv-ui' });
    const panelBody = h('div', { class: 'body' });
    const panel = h('aside', { id: 'rv-panel', class: 'rv-ui' }, h('header', {}, h('span', {}, 'Comments'), h('button', { onclick: () => panel.classList.remove('open'), 'aria-label': 'Close' }, '×')), panelBody);
    const addBtn = h('button', { class: 'add' }, 'Add comment');
    const listBtn = h('button', { class: 'list' }, 'Comments');
    // The bottom bar's way out: Versions on the current workflow, the current workflow on an archive.
    const bottomNav = (CFG.nav && CFG.nav.bottom) || { label: '← All pages', href: './' };
    const allBtn = h('a', { class: 'all', href: bottomNav.href }, bottomNav.label);
    const drawBtn = h('button', { class: 'draw' }, 'Draw');
    const bar = h('div', { id: 'rv-bar', class: 'rv-ui' }, allBtn, addBtn, drawBtn, listBtn, lockBtn);
    let pop = null;

    const route = () => location.hash.replace(/^#\/?/, '');
    const routeName = (r) => (window.reviewRouteName && window.reviewRouteName(r)) || (r ? r.split('/').join(' · ') : 'Start');
    const queue = () => JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    const setQueue = (q) => localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
    const isUi = (el) => el.closest && el.closest('.rv-ui, .rv-pop');

    const say = (msg, off) => {
        banner.textContent = msg;
        banner.className = 'rv-ui' + (msg ? ' show' : '') + (off ? ' off' : '');
    };
    const offlineNote = () => {
        const n = queue().length;
        say(online ? '' : `Comments can't reach the review service right now${n ? `; ${n} of yours kept on this device and sent when it is back` : ''}.`, true);
    };

    const api = async (method, path, body) => {
        const r = await fetch(CFG.api + path, {
            method, headers: { 'Content-Type': 'application/json', 'X-Review-Pass': localStorage.getItem(PASS_KEY) || '' },
            body: body ? JSON.stringify(body) : undefined,
        });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `error ${r.status}`);
        return r.json();
    };

    const sync = async () => {
        try {
            for (const item of queue()) {
                await api('POST', '/api/review/comments', item);
                setQueue(queue().slice(1));
            }
            const pages = [...new Set([CFG.page, ...SOURCES.map((s) => s.page)])];
            comments = (await api('GET', '/api/review/comments?' + pages.map((p) => 'page=' + encodeURIComponent(p)).join('&'))).comments;
            online = true;
        } catch {
            online = false;
        }
        offlineNote();
        render();
    };

    // An anchor is the element tapped (as a path from <body>) plus where in it, as fractions.
    const pathOf = (el) => {
        const steps = [];
        while (el && el !== document.body) {
            if (el.id) { steps.unshift('#' + CSS.escape(el.id)); break; }
            const parent = el.parentElement;
            const index = [...parent.children].indexOf(el) + 1;
            steps.unshift(`${el.tagName.toLowerCase()}:nth-child(${index})`);
            el = parent;
        }
        return steps.join(' > ');
    };
    // If the exact element is gone (the page changed), the pin falls back to the nearest
    // surviving part of its path and says it may have moved.
    const pointOf = (anchor) => {
        if (!anchor) return null;
        let path = anchor.path;
        while (path) {
            let el = null;
            try { el = document.querySelector(path); } catch { el = null; }
            if (el && el.getClientRects().length) {
                const r = el.getBoundingClientRect();
                const exact = path === anchor.path;
                return exact
                    ? { x: r.left + scrollX + r.width * anchor.fx, y: r.top + scrollY + r.height * anchor.fy, approx: false }
                    : { x: r.left + scrollX + 18, y: r.top + scrollY + 30, approx: true };
            }
            const cut = path.lastIndexOf(' > ');
            path = cut < 0 ? '' : path.slice(0, cut);
        }
        return null;
    };

    // ------------------------------------------------------------------ versions
    // Every comment belongs to a page and a version. This page shows its own comments, and carries
    // forward those of the earlier versions it lists, moved to where each place lives now.
    const SOURCES = CFG.sources || [];
    const VERSION = String(CFG.version || '1');
    const verOf = (c) => String(c.version || '1');
    const isNative = (c) => c.page === CFG.page && verOf(c) === VERSION;
    const sourceOf = (c) => SOURCES.find((s) => s.page === c.page && String(s.version) === verOf(c));
    const carryRoute = (s, r) => {
        for (const [from, to] of s.carry || []) {
            if (from === '' ? r === '' : (r === from || (from.endsWith('/') && r.startsWith(from)))) return to + r.slice(from.length);
        }
        return r;
    };
    // Page sections are named after their route (p-method-group for method/group), so the same rules
    // rename the element a carried anchor starts from.
    const carryAnchor = (s, anchor) => {
        if (!anchor || !anchor.path.startsWith('#p-')) return anchor;
        const idOf = (r) => (r === '' ? 'p-hub' : 'p-' + r.replace(/\/$/, '-').replace(/\//g, '-'));
        for (const [from, to] of s.carry || []) {
            const a = '#' + idOf(from);
            const prefix = from.endsWith('/');
            const hit = prefix ? anchor.path.startsWith(a) : (anchor.path === a || anchor.path.startsWith(a + ' '));
            if (hit) return { ...anchor, path: '#' + idOf(to) + anchor.path.slice(a.length) };
        }
        return anchor;
    };
    const placed = () => comments.filter((c) => !c.parent).map((c) => {
        if (isNative(c)) return { c, where: c.route, from: null, anchor: c.anchor };
        const s = sourceOf(c);
        return s ? { c, where: carryRoute(s, c.route), from: s, anchor: carryAnchor(s, c.anchor) } : null;
    }).filter(Boolean);

    // ------------------------------------------------------------------ two-way feedback
    // Iris answers in the thread (role "iris", posted from the team laptop only). Each reader is the
    // name they typed; their unread count is replies by others, since they last opened that thread,
    // in threads they started or joined.
    const SEEN_KEY = 'rv-seen';
    const AVATAR = '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 18 C73 18 86 34 86 56 C86 77 70 88 50 88 C30 88 14 77 14 56 C14 34 27 18 50 18 Z" fill="#2A9D8F"/><path d="M33 52 Q39 46 45 52 M55 52 Q61 46 67 52" fill="none" stroke="#1F3A4D" stroke-width="5" stroke-linecap="round"/><path d="M43 64 Q50 70 57 64" fill="none" stroke="#1F3A4D" stroke-width="5" stroke-linecap="round"/></svg>';
    const me = () => (localStorage.getItem(NAME_KEY) || '').trim().toLowerCase();
    const mine = (c) => !!me() && c.role !== 'iris' && c.name.trim().toLowerCase() === me();
    const repliesOf = (c) => comments.filter((r) => r.parent === c.id).sort((a, b) => a.created.localeCompare(b.created));
    const isMineThread = (c) => mine(c) || repliesOf(c).some(mine);
    const seenMap = () => { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}'); } catch { return {}; } };
    const seenAt = (id) => seenMap()[id] || '';
    const markSeen = (id) => { const m = seenMap(); m[id] = new Date().toISOString(); localStorage.setItem(SEEN_KEY, JSON.stringify(m)); };
    const unreadIn = (c) => {
        if (!isMineThread(c)) return 0;
        const lastMine = [c, ...repliesOf(c)].filter(mine).map((x) => x.created).sort().pop() || '';
        const since = [seenAt(c.id), lastMine].sort().pop();
        return repliesOf(c).filter((r) => !mine(r) && r.created > since).length;
    };

    const closePop = () => { if (pop) { pop.remove(); pop = null; } };
    const place = (el, x, y) => {
        document.body.append(el);
        pop = el;
        const w = el.offsetWidth;
        el.style.left = Math.max(scrollX + 8, Math.min(x + 10, scrollX + innerWidth - w - 8)) + 'px';
        el.style.top = (y + 10) + 'px';
    };

    const needName = (box) => {
        if (localStorage.getItem(NAME_KEY)) return null;
        const input = h('input', { placeholder: 'Your name', maxlength: '60' });
        box.append(h('div', { style: 'margin-bottom:8px' }, input));
        return input;
    };

    const editor = (x, y, anchor, parent, image) => {
        closePop();
        const box = h('div', { class: 'rv-pop' });
        if (image) box.append(h('img', { class: 'rv-shot', src: image, alt: 'Your drawing' }));
        const nameInput = needName(box);
        const area = h('textarea', { placeholder: parent ? 'Reply' : image ? 'What does your drawing point at? (optional)' : 'Your comment', maxlength: '4000' });
        const save = h('button', { class: 'main' }, parent ? 'Reply' : 'Save');
        box.append(area, h('div', { class: 'row' }, h('button', { onclick: closePop }, 'Cancel'), save));
        save.addEventListener('click', async () => {
            const name = nameInput ? nameInput.value.trim() : localStorage.getItem(NAME_KEY);
            if (!name) { nameInput.focus(); return; }
            if (!area.value.trim() && !image) { area.focus(); return; }
            localStorage.setItem(NAME_KEY, name);
            const item = { page: CFG.page, version: VERSION, route: route(), anchor, parent, name, text: area.value.trim(), image: image || null };
            save.disabled = true;
            try {
                await api('POST', '/api/review/comments', item);
            } catch {
                try { setQueue([...queue(), item]); } catch { say('This device has no room to keep the drawing until the review service is back. Please try again later.', true); }
                online = false;
            }
            closePop();
            await sync();
        });
        if (parent) return box;
        place(box, x, y);
        (nameInput || area).focus();
        return box;
    };

    const thread = (c, x, y, from, approx) => {
        closePop();
        const box = h('div', { class: 'rv-pop' });
        if (from) {
            box.append(h('div', { class: 'rv-from' },
                h('b', {}, `From ${from.tag}`), approx ? ' · the exact spot has changed, so this pin may have moved. ' : ' ',
                h('a', { href: `${from.file}#${c.route}`, target: '_blank', rel: 'noopener' }, 'Open where it was made →')));
        }
        const replies = repliesOf(c);
        const lastSeen = seenAt(c.id);
        for (const one of [c, ...replies]) {
            const fresh = one.parent && !mine(one) && one.created > lastSeen && isMineThread(c);
            box.append(h('div', { class: 'rv-c' + (one.parent ? ' reply' : '') + (one.role === 'iris' ? ' iris' : '') + (fresh ? ' fresh' : '') },
                one.role === 'iris' ? h('span', { class: 'rv-avatar', html: AVATAR }) : null,
                h('b', {}, one.role === 'iris' ? 'Iris' : one.name), one.role === 'iris' ? h('span', { class: 'rv-team' }, 'RegulateED team') : null,
                h('time', {}, new Date(one.created).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })),
                h('p', {}, one.text), one.image ? shotOf(one.image) : null));
        }
        if (c.resolved) box.append(h('div', { class: 'rv-closed' }, 'Closed'));
        markSeen(c.id);
        setTimeout(render, 0);
        const resolve = h('button', {}, c.resolved ? 'Reopen' : 'Resolve');
        resolve.addEventListener('click', async () => {
            try { await api('POST', `/api/review/comments/${c.id}/resolve`, { resolved: !c.resolved }); } catch { /* shown by sync */ }
            closePop();
            await sync();
        });
        const replyBox = editor(0, 0, null, c.id);
        box.append(replyBox.firstChild ? h('div', { style: 'margin-top:10px' }, ...replyBox.childNodes) : null);
        box.querySelector('.row')?.prepend(resolve);
        place(box, x, y);
    };

    // Native comments are numbered 1, 2, 3; carried ones wear their version tag (v1).
    const labelOf = (item, n) => (item.from ? String(item.from.tag).replace(/^.* (v\d+)$/, '$1') : String(n));
    const numberedItems = () => {
        let n = 0;
        return placed().map((item) => ({ ...item, label: labelOf(item, item.from ? 0 : ++n) }));
    };
    const render = () => {
        pins.replaceChildren();
        const here = route();
        const items = numberedItems();
        for (const item of items) {
            const { c, where, from, label, anchor } = item;
            if (where !== here || c.resolved) continue;
            const p = pointOf(anchor);
            if (!p) continue;
            const pin = h('button', { class: 'rv-pin' + (from ? ' carried' : '') + (p.approx ? ' moved' : '') + (unreadIn(c) ? ' unread' : ''), 'data-id': c.id, title: `${from ? from.tag + ': ' : ''}${c.name}: ${c.text.slice(0, 80)}` }, h('span', {}, label));
            pin.style.left = p.x + 'px';
            pin.style.top = p.y + 'px';
            pin.addEventListener('click', (ev) => { ev.stopPropagation(); thread(c, p.x, p.y, from, p.approx); });
            pins.append(pin);
        }
        for (const [i, q] of queue().entries()) {
            if (q.route !== here || q.parent) continue;
            const p = pointOf(q.anchor);
            if (!p) continue;
            const pin = h('div', { class: 'rv-pin pending', title: 'Not sent yet' }, h('span', {}, '…' + (i + 1)));
            pin.style.left = p.x + 'px';
            pin.style.top = p.y + 'px';
            pins.append(pin);
        }
        const open = items.filter((x) => !x.c.resolved).length;
        // Unread counts all threads this reader started or joined, on every page and version.
        const fresh = comments.filter((x) => !x.parent).reduce((n, x) => n + unreadIn(x), 0);
        listBtn.replaceChildren(`Comments ${open}`, fresh ? h('span', { class: 'rv-new' }, `${fresh} new`) : '');
        // On arrival, say it in words, once per visit: a badge alone is easy to miss.
        if (fresh && !greeted && online) {
            greeted = true;
            const who = localStorage.getItem(NAME_KEY) || '';
            const note = h('div', { id: 'rv-hello', class: 'rv-ui' },
                h('span', { class: 'rv-avatar', html: AVATAR }),
                h('span', {}, `${who ? who.charAt(0).toUpperCase() + who.slice(1) + ', y' : 'Y'}ou have ${fresh} new repl${fresh === 1 ? 'y' : 'ies'} in your comments.`),
                h('button', { class: 'go', onclick: () => { note.remove(); closePop(); panel.classList.add('open'); } }, 'Show me'),
                h('button', { class: 'x', 'aria-label': 'Dismiss', onclick: () => note.remove() }, '×'));
            document.body.append(note);
        }
        renderPanel(items);
    };

    const renderPanel = (items) => {
        panelBody.replaceChildren();
        const name = localStorage.getItem(NAME_KEY);
        if (name) {
            const change = h('button', {}, 'change');
            change.addEventListener('click', () => {
                const next = (prompt('Your name, as the team knows you', name) || '').trim();
                if (next) { localStorage.setItem(NAME_KEY, next); render(); }
            });
            panelBody.append(h('p', { class: 'who' }, `Commenting as ${name}`, change));
        }
        if (!items.length) { panelBody.append(h('p', { class: 'empty' }, 'No comments yet. Tap Add comment, then tap anywhere on the page.')); return; }
        const groups = new Map();
        for (const item of items) {
            if (!groups.has(item.where)) groups.set(item.where, []);
            groups.get(item.where).push(item);
        }
        const itemButton = ({ c, where, from, label, anchor }) => {
            const replies = repliesOf(c).length;
            return h('button', {
                class: 'item' + (c.resolved ? ' done' : '') + (from ? ' carried' : '') + (unreadIn(c) ? ' fresh' : ''),
                onclick: () => {
                    panel.classList.remove('open');
                    if (route() !== where) location.hash = where;
                    setTimeout(() => {
                        render();
                        const pin = pins.querySelector(`[data-id="${c.id}"]`);
                        const p = pointOf(anchor);
                        if (p) scrollTo({ top: Math.max(0, p.y - innerHeight / 3), behavior: 'smooth' });
                        if (pin) { pin.classList.add('flash'); setTimeout(() => pin.click(), 700); }
                        else thread(c, scrollX + innerWidth / 2 - 170, scrollY + 90, from, true);
                    }, 80);
                },
            }, h('span', { class: 'n' }, label), h('b', {}, c.name), ` ${c.resolved ? '(closed) ' : ''}`,
            unreadIn(c) ? h('span', { class: 'rv-new' }, `${unreadIn(c)} new`) : null,
            repliesOf(c).some((r) => r.role === 'iris') ? h('span', { class: 'from', style: 'color:#2A9D8F' }, 'Iris replied') : null,
            from ? h('span', { class: 'from' }, `from ${from.tag}`) : null,
            h('br'), c.text.length > 140 ? c.text.slice(0, 140) + '…' : c.text,
            replies ? h('div', { class: 'note', style: 'font-size:12px;opacity:.6;margin-top:4px' }, `${replies} repl${replies === 1 ? 'y' : 'ies'}`) : null);
        };
        // Threads with replies this reader has not seen come first.
        const fresh = items.filter((x) => unreadIn(x.c));
        if (fresh.length) {
            panelBody.append(h('div', { class: 'grp', style: 'color:#E0703F' }, 'New for you'));
            for (const item of fresh) panelBody.append(itemButton(item));
        }
        for (const [r, list] of groups) {
            panelBody.append(h('div', { class: 'grp' }, routeName(r)));
            for (const item of list) panelBody.append(itemButton(item));
        }
    };

    // ------------------------------------------------------------------ draw
    // Draw on the screen, then a screen grab with the drawing on it goes into a new comment.
    // Browsers cannot photograph a page themselves, so html2canvas (MIT, vendor/) redraws it.
    const PENS = ['#F2845C', '#E0524B', '#1F3A4D', '#2A9D8F'];
    const loadGrabber = () => window.html2canvas ? Promise.resolve() : new Promise((ok, fail) => {
        const s = document.createElement('script');
        s.src = 'vendor/html2canvas.min.js?v=1.4.1';
        s.onload = ok;
        s.onerror = fail;
        document.head.append(s);
    });

    // A serialised SVG cannot see the page's <symbol>s or CSS variables, so the copy being
    // photographed gets each <use> replaced by the shapes it points at, colours baked in.
    const flattenSvg = (doc) => {
        const NS = 'http://www.w3.org/2000/svg';
        // The copy must show the page at rest: a fade-in restarting here would wash the picture out.
        const still = doc.createElement('style');
        still.textContent = '*, *::before, *::after { animation: none !important; transition: none !important; }';
        doc.head.append(still);
        // A serialised SVG has no web fonts: give its text a system face so words still show.
        for (const t of doc.querySelectorAll('svg text')) {
            const st = t.getAttribute('style') || '';
            t.setAttribute('style', st.replace(/'?(RegulateED )?Open Sans'?\s*,/g, "'Segoe UI', Arial, Helvetica,"));
        }
        for (let pass = 0; pass < 4; pass++) {
            const uses = [...doc.querySelectorAll('svg use')];
            if (!uses.length) break;
            for (const u of uses) {
                const ref = (u.getAttribute('href') || u.getAttribute('xlink:href') || '').replace(/^#/, '');
                const sym = ref && doc.getElementById(ref);
                if (!sym) { u.remove(); continue; }
                const g = doc.createElementNS(NS, 'g');
                const vb = (sym.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
                const w = parseFloat(u.getAttribute('width'));
                const hgt = parseFloat(u.getAttribute('height'));
                let t = `translate(${parseFloat(u.getAttribute('x') || '0')} ${parseFloat(u.getAttribute('y') || '0')})`;
                if (vb.length === 4 && w && hgt) t += ` scale(${w / vb[2]} ${hgt / vb[3]}) translate(${-vb[0]} ${-vb[1]})`;
                g.setAttribute('transform', t);
                for (const kid of sym.childNodes) g.appendChild(kid.cloneNode(true));
                u.replaceWith(g);
            }
        }
        for (const e of doc.querySelectorAll('svg *')) {
            const st = e.getAttribute('style');
            if (!st || !st.includes('var(')) continue;
            const cs = doc.defaultView.getComputedStyle(e);
            e.setAttribute('style', st.replace(/fill:\s*var\([^)]*\)/g, `fill:${cs.fill}`).replace(/stroke:\s*var\([^)]*\)/g, `stroke:${cs.stroke}`));
        }
    };

    const toJpeg = (canvas) => {
        let src = canvas;
        if (canvas.width > 1600) {
            src = document.createElement('canvas');
            src.width = 1600;
            src.height = Math.round(canvas.height * 1600 / canvas.width);
            src.getContext('2d').drawImage(canvas, 0, 0, src.width, src.height);
        }
        let q = 0.85;
        let url = src.toDataURL('image/jpeg', q);
        while (url.length > 3_600_000 && q > 0.4) { q -= 0.1; url = src.toDataURL('image/jpeg', q); }
        return url;
    };

    const startDraw = () => {
        closePop();
        setPlacing(false);
        panel.classList.remove('open');
        loadGrabber().catch(() => {});
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const canvas = h('canvas', { id: 'rv-canvas', class: 'rv-ui' });
        canvas.width = Math.round(innerWidth * dpr);
        canvas.height = Math.round(innerHeight * dpr);
        const ctx = canvas.getContext('2d');
        const strokes = [];
        let pen = PENS[0];
        let live = null;

        const paint = () => {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, innerWidth, innerHeight);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            for (const s of strokes) {
                ctx.strokeStyle = s.pen;
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.moveTo(s.pts[0][0], s.pts[0][1]);
                if (s.pts.length === 1) ctx.lineTo(s.pts[0][0] + 0.1, s.pts[0][1]);
                for (let i = 1; i < s.pts.length - 1; i++) {
                    const [x0, y0] = s.pts[i];
                    const [x1, y1] = s.pts[i + 1];
                    ctx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
                }
                if (s.pts.length > 1) ctx.lineTo(...s.pts[s.pts.length - 1]);
                ctx.stroke();
            }
        };
        canvas.addEventListener('pointerdown', (ev) => {
            canvas.setPointerCapture(ev.pointerId);
            live = { pen, pts: [[ev.clientX, ev.clientY]] };
            strokes.push(live);
            paint();
        });
        canvas.addEventListener('pointermove', (ev) => { if (live) { live.pts.push([ev.clientX, ev.clientY]); paint(); } });
        const lift = () => { live = null; };
        canvas.addEventListener('pointerup', lift);
        canvas.addEventListener('pointercancel', lift);

        const swatches = PENS.map((c) => {
            const b = h('button', { class: 'sw' + (c === pen ? ' on' : ''), style: `background:${c}`, 'aria-label': 'Pen colour' });
            b.addEventListener('click', () => { pen = c; swatches.forEach((x) => x.classList.toggle('on', x === b)); });
            return b;
        });
        const end = () => { canvas.remove(); tools.remove(); html.classList.remove('rv-drawing'); offlineNote(); };
        const done = h('button', { class: 'main' }, 'Done');
        const tools = h('div', { id: 'rv-drawbar', class: 'rv-ui' }, ...swatches,
            h('span', { class: 'gap' }),
            h('button', { onclick: () => { strokes.pop(); paint(); } }, 'Undo'),
            h('button', { onclick: () => { strokes.length = 0; paint(); } }, 'Clear'),
            h('button', { onclick: end }, 'Cancel'), done);

        done.addEventListener('click', async () => {
            if (!strokes.length) { end(); return; }
            const xs = strokes.flatMap((s) => s.pts.map((p) => p[0]));
            const ys = strokes.flatMap((s) => s.pts.map((p) => p[1]));
            const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
            const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
            tools.style.visibility = 'hidden';
            canvas.style.pointerEvents = 'none';
            say('Saving a picture of the screen with your drawing…');
            // Pin the comment to whatever sits under the middle of the drawing.
            const under = document.elementFromPoint(cx, cy);
            let anchor = null;
            if (under && !isUi(under)) {
                const r = under.getBoundingClientRect();
                anchor = { path: pathOf(under), fx: r.width ? Math.min(1, Math.max(0, (cx - r.left) / r.width)) : 0, fy: r.height ? Math.min(1, Math.max(0, (cy - r.top) / r.height)) : 0 };
            }
            let image;
            try {
                await loadGrabber();
                const grab = await window.html2canvas(document.body, {
                    x: scrollX, y: scrollY, width: innerWidth, height: innerHeight,
                    windowWidth: innerWidth, windowHeight: innerHeight, scale: dpr,
                    backgroundColor: getComputedStyle(document.body).backgroundColor || '#FFF8F0',
                    logging: false, onclone: flattenSvg,
                    ignoreElements: (e) => e.id === 'rv-pins' || e.id === 'rv-canvas' || (e.classList && (e.classList.contains('rv-ui') || e.classList.contains('rv-pop'))),
                });
                const out = document.createElement('canvas');
                out.width = grab.width;
                out.height = grab.height;
                const o = out.getContext('2d');
                o.drawImage(grab, 0, 0);
                o.drawImage(canvas, 0, 0, out.width, out.height);
                image = toJpeg(out);
            } catch {
                // No picture of the page: keep the drawing itself on paper so nothing is lost.
                const out = document.createElement('canvas');
                out.width = canvas.width;
                out.height = canvas.height;
                const o = out.getContext('2d');
                o.fillStyle = '#FFF8F0';
                o.fillRect(0, 0, out.width, out.height);
                o.drawImage(canvas, 0, 0);
                image = toJpeg(out);
            }
            end();
            editor(cx + scrollX, cy + scrollY, anchor, null, image);
        });

        html.classList.add('rv-drawing');
        document.body.append(canvas, tools);
        say('Draw on anything, then tap Done.');
    };

    // A drawing in a thread: fetched with the password, opened large with a tap.
    const shotOf = (file) => {
        const img = h('img', { class: 'rv-shot', alt: 'Drawing' });
        fetch(`${CFG.api}/api/review/images/${encodeURIComponent(file)}`, { headers: { 'X-Review-Pass': localStorage.getItem(PASS_KEY) || '' } })
            .then((r) => (r.ok ? r.blob() : Promise.reject(new Error('no image'))))
            .then((b) => { img.src = URL.createObjectURL(b); })
            .catch(() => { img.replaceWith(h('p', { class: 'note' }, 'The drawing cannot be loaded right now.')); });
        img.addEventListener('click', () => {
            const big = h('div', { id: 'rv-lightbox', class: 'rv-ui', onclick: () => big.remove() }, h('img', { src: img.src, alt: 'Drawing' }), h('span', {}, 'Tap anywhere to close'));
            document.body.append(big);
        });
        return img;
    };

    const setPlacing = (on) => {
        placing = on;
        html.classList.toggle('rv-placing', on);
        addBtn.classList.toggle('on', on);
        addBtn.textContent = on ? 'Cancel' : 'Add comment';
        if (on) { closePop(); say('Tap the spot you want to comment on.'); } else offlineNote();
    };

    function startPins() {
        document.body.append(pins, banner, panel, bar);
        addBtn.addEventListener('click', () => setPlacing(!placing));
        listBtn.addEventListener('click', () => { closePop(); panel.classList.toggle('open'); });
        drawBtn.addEventListener('click', startDraw);
        // Capture phase, so a tap while placing never also follows a link or button on the page.
        document.addEventListener('click', (ev) => {
            if (!placing || isUi(ev.target)) return;
            ev.preventDefault();
            ev.stopPropagation();
            const target = ev.target.nodeType === 1 ? ev.target : ev.target.parentElement;
            const r = target.getBoundingClientRect();
            const anchor = {
                path: pathOf(target),
                fx: r.width ? Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)) : 0,
                fy: r.height ? Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height)) : 0,
            };
            setPlacing(false);
            editor(ev.pageX, ev.pageY, anchor, null);
        }, true);
        document.addEventListener('click', (ev) => { if (pop && !isUi(ev.target) && !ev.target.closest('.rv-pin')) closePop(); });
        addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { setPlacing(false); closePop(); } });
        addEventListener('hashchange', () => { closePop(); setTimeout(render, 40); });
        addEventListener('resize', () => setTimeout(render, 60));
        sync();
        setInterval(sync, 20000);
    }

    gate();
})();
