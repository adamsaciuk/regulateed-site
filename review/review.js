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

    const unlock = () => {
        html.classList.remove('rv-locked');
        document.getElementById('rv-gate')?.remove();
        if (CFG.page) startPins();
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
    let online = true;
    const pins = h('div', { id: 'rv-pins', class: 'rv-ui' });
    const banner = h('div', { id: 'rv-banner', class: 'rv-ui' });
    const panelBody = h('div', { class: 'body' });
    const panel = h('aside', { id: 'rv-panel', class: 'rv-ui' }, h('header', {}, h('span', {}, 'Comments'), h('button', { onclick: () => panel.classList.remove('open'), 'aria-label': 'Close' }, '×')), panelBody);
    const addBtn = h('button', { class: 'add' }, 'Add comment');
    const listBtn = h('button', { class: 'list' }, 'Comments');
    // Every review page leads back to the list of review pages.
    const allBtn = h('a', { class: 'all', href: './', title: 'All review pages' }, '← All pages');
    const bar = h('div', { id: 'rv-bar', class: 'rv-ui' }, allBtn, addBtn, listBtn);
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
            comments = (await api('GET', '/api/review/comments?page=' + encodeURIComponent(CFG.page))).comments;
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
    const pointOf = (anchor) => {
        if (!anchor) return null;
        let el = null;
        try { el = document.querySelector(anchor.path); } catch { return null; }
        if (!el || !el.getClientRects().length) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left + scrollX + r.width * anchor.fx, y: r.top + scrollY + r.height * anchor.fy };
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

    const editor = (x, y, anchor, parent) => {
        closePop();
        const box = h('div', { class: 'rv-pop' });
        const nameInput = needName(box);
        const area = h('textarea', { placeholder: parent ? 'Reply' : 'Your comment', maxlength: '4000' });
        const save = h('button', { class: 'main' }, parent ? 'Reply' : 'Save');
        box.append(area, h('div', { class: 'row' }, h('button', { onclick: closePop }, 'Cancel'), save));
        save.addEventListener('click', async () => {
            const name = nameInput ? nameInput.value.trim() : localStorage.getItem(NAME_KEY);
            if (!name) { nameInput.focus(); return; }
            if (!area.value.trim()) { area.focus(); return; }
            localStorage.setItem(NAME_KEY, name);
            const item = { page: CFG.page, route: route(), anchor, parent, name, text: area.value.trim() };
            save.disabled = true;
            try {
                await api('POST', '/api/review/comments', item);
            } catch {
                setQueue([...queue(), item]);
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

    const thread = (c, x, y) => {
        closePop();
        const box = h('div', { class: 'rv-pop' });
        const replies = comments.filter((r) => r.parent === c.id);
        for (const one of [c, ...replies]) {
            box.append(h('div', { class: 'rv-c' + (one.parent ? ' reply' : '') },
                h('b', {}, one.name), h('time', {}, new Date(one.created).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })),
                h('p', {}, one.text)));
        }
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

    const tops = () => comments.filter((c) => !c.parent);
    const render = () => {
        pins.replaceChildren();
        const here = route();
        const numbered = tops();
        numbered.forEach((c, i) => {
            if (c.route !== here || c.resolved) return;
            const p = pointOf(c.anchor);
            if (!p) return;
            const pin = h('button', { class: 'rv-pin', 'data-id': c.id, title: `${c.name}: ${c.text.slice(0, 80)}` }, h('span', {}, String(i + 1)));
            pin.style.left = p.x + 'px';
            pin.style.top = p.y + 'px';
            pin.addEventListener('click', (ev) => { ev.stopPropagation(); thread(c, p.x, p.y); });
            pins.append(pin);
        });
        for (const [i, q] of queue().entries()) {
            if (q.route !== here || q.parent) continue;
            const p = pointOf(q.anchor);
            if (!p) continue;
            const pin = h('div', { class: 'rv-pin pending', title: 'Not sent yet' }, h('span', {}, '…' + (i + 1)));
            pin.style.left = p.x + 'px';
            pin.style.top = p.y + 'px';
            pins.append(pin);
        }
        const open = numbered.filter((c) => !c.resolved).length;
        listBtn.textContent = `Comments ${open}`;
        renderPanel(numbered);
    };

    const renderPanel = (numbered) => {
        panelBody.replaceChildren();
        if (!numbered.length) { panelBody.append(h('p', { class: 'empty' }, 'No comments yet. Tap Add comment, then tap anywhere on the page.')); return; }
        const groups = new Map();
        numbered.forEach((c, i) => {
            if (!groups.has(c.route)) groups.set(c.route, []);
            groups.get(c.route).push([c, i + 1]);
        });
        for (const [r, items] of groups) {
            panelBody.append(h('div', { class: 'grp' }, routeName(r)));
            for (const [c, n] of items) {
                const replies = comments.filter((x) => x.parent === c.id).length;
                panelBody.append(h('button', {
                    class: 'item' + (c.resolved ? ' done' : ''),
                    onclick: () => {
                        panel.classList.remove('open');
                        if (route() !== c.route) location.hash = c.route;
                        setTimeout(() => {
                            render();
                            const pin = pins.querySelector(`[data-id="${c.id}"]`);
                            const p = pointOf(c.anchor);
                            if (p) scrollTo({ top: Math.max(0, p.y - innerHeight / 3), behavior: 'smooth' });
                            if (pin) { pin.classList.add('flash'); setTimeout(() => pin.click(), 700); }
                        }, 80);
                    },
                }, h('span', { class: 'n' }, String(n)), h('b', {}, c.name), ` ${c.resolved ? '(resolved) ' : ''}`, h('br'), c.text.length > 140 ? c.text.slice(0, 140) + '…' : c.text, replies ? h('div', { class: 'note', style: 'font-size:12px;opacity:.6;margin-top:4px' }, `${replies} repl${replies === 1 ? 'y' : 'ies'}`) : null));
            }
        }
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
