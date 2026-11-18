// RegulateED review sprints (Adam, 2026-11-18). A sprint is one collaboration session. Every thread,
// made anywhere at any time, is attached to a category of the sprint; its discussion stays in the
// thread, which its creator owns, and it ends resolved (something changes) or with no action. Each
// category gathers its actions, findings and agreements, ready for the development update that
// prepares the next sprint. Earlier sprints are history, out of the way. Iris Chat is each reader's
// general chat with Iris. Links in any message become chips. Loaded after review.js (window.RV).
(function () {
    'use strict';
    let RV = null;
    let tracker = { sprint: '2', sprints: [], categories: [], legacy: {} };
    let tab = 'sprint';
    let openCat = null;
    let showHistory = false;
    let linkTarget = null;
    let firstLoad = true;
    let cardShownFor = '';
    const CHAT_SEEN = 'rv-chat-seen';
    const TOKEN = /\[\[([a-z0-9]+)(?::([^\]|]*))?(?:\|([^\]]*))?\]\]/g;

    const css = `
        #rv-panel header .rv-tabs { display: flex; gap: 4px; }
        #rv-panel header .rv-tabs button { font: inherit; font-size: 14px; font-weight: 800; color: rgba(255,255,255,.7); background: none; border: 0; border-radius: 20px; padding: 6px 11px; cursor: pointer; }
        #rv-panel header .rv-tabs button.on { background: #FFF8F0; color: #1F3A4D; }
        #rv-panel header .rv-tabs .dot { display: inline-block; min-width: 8px; height: 8px; border-radius: 50%; background: #E0524B; margin-left: 5px; vertical-align: 2px; }
        #rv-panel.wide { width: min(460px, 96vw); }
        .rv-rbody { overflow: auto; padding: 10px 14px 16px; flex: 1; }
        .rv-chip { display: inline-flex; align-items: center; gap: 4px; font: inherit; font-size: 12.5px; font-weight: 800; line-height: 1.2; color: #1F3A4D; background: #EEF8F6; border: 1px solid #BFE3DC; border-radius: 20px; padding: 3px 9px; margin: 2px 2px 2px 0; cursor: pointer; text-decoration: none; vertical-align: 1px; }
        .rv-chip:hover { background: #DDF1EC; }
        .rv-chip.ck-item { background: #FFF4EC; border-color: #F8D5C2; }
        .rv-chip.ck-research { background: #F2EEF8; border-color: #D9CFEA; }
        /* chips sit inside threads, the card and chats, whose own button styles must not reach them */
        #rv-card button.rv-chip, .rv-pop button.rv-chip, .rv-compose button.rv-chip, #rv-panel button.rv-chip { font-size: 12.5px; font-weight: 800; border-radius: 20px; padding: 3px 9px; width: auto; display: inline-flex; margin: 2px 2px 2px 0; }
        #rv-card button.rv-chip:not(.ck-item):not(.ck-research), .rv-pop button.rv-chip:not(.ck-item):not(.ck-research) { background: #EEF8F6; border: 1px solid #BFE3DC; }
        #rv-card button.rv-chip.ck-item, .rv-pop button.rv-chip.ck-item { background: #FFF4EC; border: 1px solid #F8D5C2; }
        #rv-card button.rv-chip.ck-research, .rv-pop button.rv-chip.ck-research { background: #F2EEF8; border: 1px solid #D9CFEA; }
        html.rv-paused #rv-card { top: 150px; }
        .rv-chip .k { font-size: 10.5px; letter-spacing: .6px; text-transform: uppercase; opacity: .7; }
        .rv-state { border-radius: 10px; padding: 7px 10px; margin-bottom: 8px; font-size: 13px; line-height: 1.4; background: #EEF8F6; }
        .rv-state.asked { background: #FFF6E0; }
        .rv-tag { display: inline-block; margin-left: 6px; font-size: 11px; font-weight: 800; border-radius: 12px; padding: 1px 7px; letter-spacing: .4px; }
        .rv-tag.item { background: #FFF4EC; color: #E0703F; }
        .rv-tag.asked { background: #FFF6E0; color: #9A6A00; }
        .rv-pill { display: inline-block; font-size: 11px; font-weight: 800; border-radius: 12px; padding: 2px 8px; letter-spacing: .4px; text-transform: uppercase; }
        .rv-pill.call { background: #FDE3D7; color: #B4532C; } .rv-pill.asked { background: #FFF0C7; color: #8A6000; }
        .rv-pill.research { background: #ECE6F6; color: #5E4A8C; } .rv-pill.ok { background: #DDF1EC; color: #1E7268; }
        .rv-pill.grey { background: #ECEFF1; color: #5F6E78; } .rv-pill.done { background: #1F3A4D; color: #fff; }
        .rv-it { display: block; width: 100%; text-align: left; font: inherit; background: #fff; border: 1px solid #E9E1D6; border-radius: 12px; padding: 10px 12px; margin-bottom: 8px; cursor: pointer; }
        .rv-it .id { font-weight: 800; color: #E0703F; margin-right: 6px; }
        .rv-it .meta { font-size: 12px; color: #4A5E6D; margin-top: 4px; }
        .rv-sec { font-size: 12px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; color: #2A9D8F; margin: 14px 0 6px; }
        .rv-box { background: #fff; border: 1px solid #E9E1D6; border-radius: 12px; padding: 10px 12px; margin-bottom: 8px; font-size: 14px; line-height: 1.45; }
        .rv-box.quote { border-left: 3px solid #F2845C; }
        .rv-box .who { font-size: 12px; font-weight: 800; color: #4A5E6D; margin-bottom: 3px; }
        .rv-back { font: inherit; font-weight: 800; font-size: 14px; color: #2A9D8F; background: none; border: 0; padding: 4px 0; cursor: pointer; }
        .rv-msgs { display: flex; flex-direction: column; gap: 8px; }
        .rv-msg { max-width: 88%; border-radius: 14px; padding: 8px 11px; font-size: 14px; line-height: 1.45; background: #fff; border: 1px solid #E9E1D6; white-space: pre-wrap; }
        .rv-msg.iris { background: #EEF8F6; border-color: #CBE9E3; align-self: flex-start; }
        .rv-msg.me { background: #FFF4EC; border-color: #F8D5C2; align-self: flex-end; }
        .rv-msg .who { font-size: 11.5px; font-weight: 800; color: #4A5E6D; margin-bottom: 2px; white-space: normal; }
        .rv-msg .who time { font-weight: 600; opacity: .7; margin-left: 6px; }
        .rv-compose { margin-top: 10px; }
        .rv-compose textarea { width: 100%; box-sizing: border-box; font: inherit; font-size: 15px; border: 2px solid #E9E1D6; border-radius: 12px; padding: 8px 10px; min-height: 70px; resize: vertical; }
        .rv-compose .row { display: flex; gap: 8px; justify-content: space-between; margin-top: 8px; }
        .rv-compose button { font: inherit; font-weight: 700; font-size: 14px; border: 1px solid #E9E1D6; background: #fff; border-radius: 30px; padding: 7px 14px; cursor: pointer; }
        .rv-compose button.main { background: #2A9D8F; border-color: #2A9D8F; color: #fff; }
        .rv-compose button.on { background: #1F3A4D; border-color: #1F3A4D; color: #fff; }
        .rv-hint { font-size: 12.5px; color: #4A5E6D; margin: 4px 2px 8px; line-height: 1.45; }
        #rv-bar .iris { background: #fff; color: #1F3A4D; position: relative; }
        #rv-bar .iris .rv-avatar svg { width: 20px; height: 20px; margin-right: 4px; vertical-align: -5px; }
        #rv-bar .iris.fresh::after { content: ""; position: absolute; top: 2px; right: 4px; width: 11px; height: 11px; border-radius: 50%; background: #E0524B; border: 2px solid #fff; }
        #rv-card { position: fixed; left: 50%; top: 78px; transform: translateX(-50%); z-index: 9160; width: min(440px, calc(100vw - 20px)); background: #fff; border: 2px solid #2A9D8F; border-radius: 18px; box-shadow: 0 16px 40px rgba(31,58,77,.3); padding: 14px 16px; font-size: 15px; line-height: 1.5; animation: rvcard .35s ease-out; }
        #rv-card .hd { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 16px; margin-bottom: 6px; }
        #rv-card .hd svg { width: 30px; height: 30px; }
        #rv-card .tx { max-height: 40vh; overflow: auto; white-space: pre-wrap; color: #1F3A4D; }
        #rv-card .also { font-size: 13px; color: #4A5E6D; margin-top: 8px; }
        #rv-card .row { display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px; }
        #rv-card button { font: inherit; font-weight: 800; border: 1px solid #E9E1D6; background: #fff; border-radius: 30px; padding: 8px 16px; cursor: pointer; }
        #rv-card button.main { background: #2A9D8F; border-color: #2A9D8F; color: #fff; }
        @keyframes rvcard { from { opacity: 0; transform: translate(-50%, -10px); } to { opacity: 1; transform: translate(-50%, 0); } }
        .rv-ring { position: absolute; z-index: 8100; width: 54px; height: 54px; margin: -27px 0 0 -27px; border-radius: 50%; border: 4px solid #F2845C; pointer-events: none; animation: rvring 1s ease-out 3; }
        @keyframes rvring { from { transform: scale(.4); opacity: 1; } to { transform: scale(1.4); opacity: 0; } }
        html.rv-linking, html.rv-linking * { cursor: crosshair !important; }
        .rv-cat { display: block; width: 100%; text-align: left; font: inherit; background: #fff; border: 1px solid #E9E1D6; border-left: 5px solid #2A9D8F; border-radius: 12px; padding: 10px 12px; margin-bottom: 8px; cursor: pointer; }
        .rv-cat.demo { border-left-color: #8A97A1; border-style: dashed solid dashed dashed; }
        .rv-cat b { display: block; font-size: 16px; }
        .rv-cat .p { font-size: 13px; color: #4A5E6D; margin-top: 2px; }
        .rv-cat .meta { font-size: 12px; color: #4A5E6D; margin-top: 6px; display: flex; flex-wrap: wrap; gap: 6px; }
        .rv-n { display: inline-block; border-radius: 10px; padding: 1px 7px; font-weight: 800; background: #F1EBE2; }
        .rv-n.open { background: #FDE3D7; color: #B4532C; } .rv-n.res { background: #DDF1EC; color: #1E7268; } .rv-n.na { background: #ECEFF1; color: #5F6E78; } .rv-n.rq { background: #ECE6F6; color: #5E4A8C; }
        .rv-th { display: block; width: 100%; text-align: left; font: inherit; font-size: 14px; background: #fff; border: 1px solid #E9E1D6; border-radius: 12px; padding: 9px 11px; margin-bottom: 7px; cursor: pointer; }
        .rv-th .who { font-size: 12px; font-weight: 800; color: #4A5E6D; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
        .rv-sum li { margin: 4px 0; }
        .rv-file { margin-bottom: 8px; display: grid; gap: 6px; }
        .rv-file label { font-size: 13px; font-weight: 800; }
        .rv-file select { font: inherit; font-size: 15px; border: 2px solid #E9E1D6; border-radius: 10px; padding: 7px 8px; background: #fff; width: 100%; }
        .rv-file select.need { border-color: #E0524B; box-shadow: 0 0 0 3px rgba(224,82,75,.15); }
        .rv-file .rq { font-size: 13px; font-weight: 700; display: flex; gap: 6px; align-items: center; }
        .rv-file .rq input { width: 17px; height: 17px; accent-color: #8A6FB0; }
        .rv-sp { display: flex; align-items: center; gap: 8px; font-size: 20px; margin: 2px 0 2px; }
        .rv-cn { border: 1px solid #E9E1D6; border-left: 5px solid #2A9D8F; border-radius: 12px; background: #fff; margin-bottom: 8px; }
        .rv-cn.demo { border-left-color: #8A97A1; }
        .rv-cnh, .rv-tnh { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; width: 100%; text-align: left; font: inherit; background: none; border: 0; padding: 10px 12px; cursor: pointer; color: #1F3A4D; }
        .rv-cnh b { font-size: 16px; } .rv-cnh .meta { display: flex; gap: 4px; flex-wrap: wrap; margin-left: auto; font-size: 11.5px; }
        .rv-tw, .tw { width: 14px; color: #2A9D8F; font-weight: 800; }
        .rv-ci { padding: 0 10px 10px 22px; }
        .rv-roll { background: #F7FBFA; border: 1px solid #CBE9E3; border-radius: 10px; padding: 6px 10px; margin-bottom: 8px; font-size: 13.5px; }
        .rv-rolltitle { font-size: 12px; font-weight: 800; color: #1E7268; text-transform: uppercase; letter-spacing: .8px; margin: 2px 0; }
        .rv-roll .rv-sec { margin: 6px 0 2px; font-size: 11px; } .rv-roll ul { margin: 0; padding-left: 18px; }
        .rv-tn { border-left: 2px solid #E9E1D6; margin: 0 0 6px; } .rv-tn.open { border-left-color: #F2845C; }
        .rv-tnh { padding: 7px 8px; font-size: 14px; } .rv-tnh b { font-size: 14.5px; } .rv-tnh .by { flex-basis: 100%; padding-left: 20px; font-size: 12px; color: #4A5E6D; }
        .rv-talk { padding: 2px 6px 8px 18px; display: flex; flex-direction: column; gap: 6px; }
        .rv-talk .rv-msg { max-width: 100%; } .rv-talk .rv-shot { width: 100%; border-radius: 8px; margin-top: 6px; cursor: zoom-in; }
        .rv-state.ok { background: #DDF1EC; }
        .rv-hist { font: inherit; font-weight: 800; font-size: 14px; color: #4A5E6D; background: #F7F1E8; border: 1px solid #E9E1D6; border-radius: 12px; padding: 9px 12px; width: 100%; text-align: left; cursor: pointer; margin-top: 14px; }
    `;

    // ------------------------------------------------------------------ helpers
    const h = (...a) => RV.h(...a);
    const me = () => RV.me();
    const myName = () => localStorage.getItem(RV.NAME_KEY) || '';
    const when = (iso) => new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    const comments = () => RV.comments();
    const links = () => (RV.CFG.links || {});
    const onCurrent = () => !!RV.CFG.page && !RV.CFG.archived && RV.CFG.page === (links().currentPage || RV.CFG.page) && (RV.CFG.file || 'index.html') === (links().current || 'index.html');
    const current = () => String(tracker.sprint || '2');
    const sprintOf = (c) => String(c.sprint || '1');
    const isThread = (c) => !c.parent && c.page !== 'chat' && c.page !== 'item';
    const filed = (c) => c.category && c.category !== '?';
    const catById = (id) => (tracker.categories || []).find((x) => x.id === id) || (tracker.legacy && tracker.legacy[id] ? (tracker.categories || []).find((x) => x.id === tracker.legacy[id]) : null);
    const liveCats = () => (tracker.categories || []).filter((x) => String(x.sprint) === current());
    const threadsIn = (sp, catId) => comments().filter((c) => isThread(c) && sprintOf(c) === sp && (catId === undefined ? true : catId === null ? !filed(c) : c.category === catId));
    const seen = (key) => { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; } };
    const markSeen = (key, id) => { const m = seen(key); m[id] = new Date().toISOString(); localStorage.setItem(key, JSON.stringify(m)); };
    const chatOf = (who) => comments().filter((c) => c.page === 'chat' && c.route === who).sort((a, b) => a.created.localeCompare(b.created));
    const irisUnseen = () => { const s = seen(CHAT_SEEN).chat || ''; return chatOf(me()).filter((c) => c.role === 'iris' && c.created > s); };
    const lastReply = (c) => { const r = RV.repliesOf(c); return r[r.length - 1]; };
    const stateOf = (c) => {
        if (c.resolved) return c.outcome === 'noaction' ? ['No action', 'na'] : ['Resolved', 'res'];
        if (c.research && c.research.state !== 'answered') return [c.research.state === 'progress' ? 'Research in progress' : 'Research requested', 'rq'];
        const last = lastReply(c);
        if (last && last.role === 'iris' && last.text.includes('?')) return ['Iris asked you', 'open'];
        return ['Open', 'open'];
    };

    const goRoute = (route) => {
        if (onCurrent()) { location.hash = route; return; }
        location.href = (links().current || 'index.html') + '#' + route;
    };
    const flashAt = (anchor) => {
        const p = RV.pointOf(anchor);
        if (!p) { RV.say('That spot is not on this page any more.'); setTimeout(() => RV.say(''), 3000); return; }
        scrollTo({ top: Math.max(0, p.y - innerHeight / 3), behavior: 'smooth' });
        const ring = h('div', { class: 'rv-ring' });
        ring.style.left = p.x + 'px';
        ring.style.top = p.y + 'px';
        document.body.append(ring);
        setTimeout(() => ring.remove(), 3200);
    };
    const spotOf = (arg) => {
        const [route, path, fx, fy, page] = String(arg || '').split('~');
        return { route: route || '', page: page || '', anchor: path ? { path, fx: Number(fx) || 0, fy: Number(fy) || 0 } : null };
    };
    const openThreadAnywhere = (id) => {
        if (RV.openThread(id)) return;
        const c = comments().find((x) => x.id === id);
        const file = c && c.page === 'demo' ? links().demo : c && c.page === 'manual' ? links().manual : c && sprintOf(c) !== current() ? null : links().current;
        if (file) location.href = file + '?thread=' + encodeURIComponent(id);
        else RV.say('That thread belongs to an earlier sprint: open it from Sprint 1 history.');
    };

    // ------------------------------------------------------------------ chips
    // [[category:C2-01]] [[research:faces]] [[page:<route>]] [[thread:<id>]] [[spot:<route>~<path>~fx~fy~<page>]]
    // [[v1:<route>]] [[manual]] [[chat]] [[tracker]], each with an optional |label. Older [[item:S1-03]] links
    // open the category the item became.
    const chipFor = (kind, arg, label) => {
        const research = window.reviewResearch || {};
        const make = (cls, k, text, act) => {
            const b = h('button', { class: 'rv-chip ' + cls, type: 'button' }, k ? h('span', { class: 'k' }, k) : null, text);
            b.addEventListener('click', (ev) => { ev.stopPropagation(); ev.preventDefault(); act(); });
            return b;
        };
        switch (kind) {
            case 'category':
            case 'item': { const ct = catById(arg); return make('ck-item', 'Category', label || (ct ? ct.title : arg), () => openCategory(ct ? ct.id : null)); }
            case 'research': return make('ck-research', 'Research', label || research[arg] || arg, () => goRoute('foundations/research/' + arg));
            case 'page': return make('', 'Page', label || RV.routeName(arg), () => goRoute(arg));
            case 'thread': return make('', 'Thread', label || ((comments().find((x) => x.id === arg) || {}).title) || 'Open the thread', () => (comments().some((x) => x.id === arg) ? focusThread(arg) : openThreadAnywhere(arg)));
            case 'spot': {
                const s = spotOf(arg);
                const page = s.page || links().currentPage || 'workflow';
                const here = page === RV.CFG.page && (page !== links().currentPage || onCurrent());
                const name = page === 'demo' ? 'Demo page' : page === 'manual' ? 'The manual' : RV.routeName(s.route);
                return make('', 'Spot', label || name, () => {
                    if (here) { if (RV.route() !== s.route) location.hash = s.route; setTimeout(() => flashAt(s.anchor), 300); }
                    else location.href = (page === links().currentPage ? links().current : links()[page] || links().current || 'index.html') + '?spot=' + encodeURIComponent(arg) + '#' + s.route;
                });
            }
            case 'v1': return make('', 'Sprint 1', label || 'As it was', () => { location.href = (links()['workflow@1'] || 'workflow-v1.html') + '#' + arg; });
            case 'manual': return make('', '', label || 'The review manual', () => { location.href = links().manual || 'manual.html'; });
            case 'chat': return make('', '', label || 'Iris Chat', () => openPanel('iris'));
            case 'tracker': return make('ck-item', '', label || `Sprint ${current()}`, () => openCategory(null));
            default: return null;
        }
    };
    const chips = (text) => {
        const out = [];
        let last = 0;
        for (const m of String(text).matchAll(TOKEN)) {
            if (m.index > last) out.push(text.slice(last, m.index));
            out.push(chipFor(m[1], m[2] || '', m[3] || '') || m[0]);
            last = m.index + m[0].length;
        }
        if (last < text.length) out.push(text.slice(last));
        return out;
    };
    const plain = (text) => String(text).replace(TOKEN, (_, k, a, l) => (l || (k === 'item' || k === 'category' ? (catById(a) || {}).title || a : k === 'research' ? 'research' : 'link')));

    // ------------------------------------------------------------------ threads
    const threadHead = (c) => {
        if (!isThread(c)) return null;
        const ct = filed(c) ? catById(c.category) : null;
        const [st] = stateOf(c);
        const head = h('div', { class: 'rv-state' + (st === 'Iris asked you' ? ' asked' : '') },
            ct ? h('span', {}, h('b', {}, 'Category: '), chipFor('category', ct.id)) : h('span', {}, h('b', {}, 'Not filed yet: '), 'Iris will attach it to a category.'),
            h('br'), h('b', {}, st), sprintOf(c) !== current() ? ` · Sprint ${sprintOf(c)}` : '');
        if (c.research) head.append(h('br'), h('b', {}, 'Research request: '), c.research.state === 'answered' && c.research.slug ? chipFor('research', c.research.slug) : (c.research.state === 'progress' ? 'Iris is working on it.' : 'Iris will research it and answer here.'));
        if (c.resolved && c.note) head.append(h('br'), plain(c.note).slice(0, 200));
        return head;
    };
    const listTag = (c) => {
        if (!isThread(c)) return null;
        const ct = filed(c) ? catById(c.category) : null;
        return h('span', { class: 'rv-tag item' }, ct ? ct.title : 'Not filed');
    };
    // The editor's category choice: required on every new thread (Adam, Sprint 2).
    const categoryPicker = () => {
        const sel = h('select', {}, h('option', { value: '' }, 'Choose a category…'),
            ...liveCats().filter((x) => !x.demo || RV.CFG.page === 'demo').map((x) => h('option', { value: x.id }, x.title)),
            h('option', { value: '?' }, 'Not sure: Iris files it'));
        const demo = liveCats().find((x) => x.demo);
        if (RV.CFG.page === 'demo' && demo) sel.value = demo.id;
        const rq = h('input', { type: 'checkbox' });
        const title = h('input', { placeholder: 'Short title, for example: Reggie icons', maxlength: '80' });
        const el = h('div', { class: 'rv-file' }, h('label', {}, 'Thread title'), title, h('label', {}, 'Category'), sel, h('label', { class: 'rq' }, rq, 'This is a research request'));
        sel.addEventListener('change', () => sel.classList.remove('need'));
        return { el, value: () => sel.value, title: () => title.value.trim(), research: () => rq.checked, ask: () => { sel.classList.add('need'); sel.focus(); RV.say('Choose a category for this thread first.'); setTimeout(() => RV.say(''), 3000); } };
    };

    // ------------------------------------------------------------------ panel tabs
    let body = null;
    let tabsEl = null;
    let irisBtn = null;
    let sprintBtn = null;
    const openPanel = (which) => { tab = which; RV.closePop(); RV.panel.classList.add('open'); paint(); };
    const openCategory = (id) => { openCat = null; if (id) openCats.add(id); openPanel('sprint'); };
    const paint = () => {
        const fresh = irisUnseen().length;
        // Comments nest under categories (Adam): the sprint and Iris Chat are the only tabs.
        tabsEl.replaceChildren(...[['sprint', `Sprint ${current()}`], ['iris', 'Iris Chat']].map(([k, t]) => {
            const b = h('button', { class: tab === k ? 'on' : '', type: 'button' }, t, k === 'iris' && fresh ? h('span', { class: 'dot' }) : null);
            b.addEventListener('click', () => { tab = k; openCat = null; paint(); });
            return b;
        }));
        irisBtn.replaceChildren(h('span', { class: 'rv-avatar', html: RV.AVATAR }), 'Iris');
        irisBtn.classList.toggle('fresh', !!fresh);
        RV.panel.classList.add('wide');
        RV.panelBody.style.display = 'none';
        body.style.display = '';
        const mineFresh = comments().filter((c) => isThread(c) && sprintOf(c) === current()).reduce((a, c) => a + RV.unreadIn(c), 0);
        sprintBtn.replaceChildren(`Sprint ${current()}`, mineFresh ? h('span', { class: 'rv-new' }, `${mineFresh}`, h('span', { class: 'lg' }, ' new')) : '');
        if (tab === 'sprint') paintSprint();
        if (tab === 'iris') paintIris();
    };
    const counts = (list) => {
        const n = { open: 0, res: 0, na: 0, rq: 0 };
        for (const c of list) { const k = stateOf(c)[1]; n[k] = (n[k] || 0) + 1; }
        return n;
    };
    const threadRow = (c) => {
        const [st, k] = stateOf(c);
        const fresh = RV.unreadIn(c);
        const b = h('button', { class: 'rv-th', type: 'button' },
            h('div', { class: 'who' }, c.name, h('span', { class: 'rv-n ' + k }, st), fresh ? h('span', { class: 'rv-new' }, `${fresh} new`) : null, `${RV.repliesOf(c).length} repl${RV.repliesOf(c).length === 1 ? 'y' : 'ies'}`),
            plain(c.text).length > 130 ? plain(c.text).slice(0, 130) + '…' : plain(c.text));
        b.addEventListener('click', () => openThreadAnywhere(c.id));
        return b;
    };

    // ------------------------------------------------------------------ the sprint as one tree
    // Adam: "it is a hierarchial context and discussion tracker". Sprint, then its categories, then each
    // category's titled threads, then the thread's discussion and answers, all in one tree. A pin on the
    // page opens its thread here, under its category.
    const openCats = new Set();
    const openThreads = new Set();
    let focusId = null;
    const titleOf = (c) => c.title || plain(c.text).split(/[.?!\n]/)[0].slice(0, 60) || 'Untitled thread';
    const endThread = (c, resolved, outcome) => async () => {
        try { await RV.api('POST', `/api/review/comments/${c.id}/resolve`, { resolved, outcome }); } catch { RV.say('That did not save; please try again shortly.'); }
        await RV.sync();
    };
    const canWrite = (c) => !RV.isPaused() || c.page === 'demo';
    const threadNode = (c) => {
        const [st, k] = stateOf(c);
        const fresh = RV.unreadIn(c);
        const open = openThreads.has(c.id);
        const node = h('div', { class: 'rv-tn' + (open ? ' open' : ''), 'data-thread': c.id });
        const head = h('button', { class: 'rv-tnh', type: 'button' }, h('span', { class: 'tw' }, open ? '▾' : '▸'), h('b', {}, titleOf(c)),
            h('span', { class: 'rv-n ' + k }, st), fresh ? h('span', { class: 'rv-new' }, `${fresh} new`) : null,
            h('span', { class: 'by' }, `${c.name} · ${RV.repliesOf(c).length} repl${RV.repliesOf(c).length === 1 ? 'y' : 'ies'}`));
        head.addEventListener('click', () => { if (open) openThreads.delete(c.id); else { openThreads.add(c.id); RV.markSeen(c.id); } paint(); });
        node.append(head);
        if (!open) return node;
        const talk = h('div', { class: 'rv-talk' });
        for (const m of [c, ...RV.repliesOf(c)]) {
            talk.append(h('div', { class: 'rv-msg' + (m.role === 'iris' ? ' iris' : RV.mine(m) ? ' me' : '') },
                h('div', { class: 'who' }, m.role === 'iris' ? 'Iris' : m.name, h('time', {}, when(m.created))), ...chips(m.text), m.image ? RV.shotOf(m.image) : null));
        }
        if (c.research) talk.append(h('div', { class: 'rv-state' }, h('b', {}, 'Research request: '), c.research.state === 'answered' && c.research.slug ? chipFor('research', c.research.slug) : c.research.state === 'progress' ? 'Iris is working on it; the answer comes back here.' : 'Iris will research it and answer here.'));
        if (c.resolved) talk.append(h('div', { class: 'rv-state' + (c.outcome === 'noaction' ? '' : ' ok') }, h('b', {}, c.outcome === 'noaction' ? 'Closed with no action' : 'Resolved'), c.note ? ': ' + plain(c.note).slice(0, 240) : ''));
        const where = h('button', { class: 'rv-chip', type: 'button' }, h('span', { class: 'k' }, 'Evidence'), 'Show it on the page');
        where.addEventListener('click', (ev) => { ev.stopPropagation(); RV.panel.classList.remove('open'); if (!RV.openThread(c.id)) openThreadAnywhere(c.id); });
        talk.append(h('div', { style: 'margin:6px 0' }, where));
        if (canWrite(c)) {
            const area = h('textarea', { placeholder: 'Reply in this thread', maxlength: '4000' });
            const send = h('button', { class: 'main', type: 'button' }, 'Reply');
            send.addEventListener('click', async () => {
                const name = myName();
                if (!name) { RV.say('Choose who you are first: add something to a category once.'); setTimeout(() => RV.say(''), 3000); return; }
                if (!area.value.trim()) { area.focus(); return; }
                send.disabled = true;
                try { await RV.api('POST', '/api/review/comments', { page: c.page, version: c.version || '1', route: c.route, anchor: null, parent: c.id, name, text: area.value.trim() }); }
                catch { RV.say('That did not send; please try again shortly.'); }
                await RV.sync();
            });
            const ends = c.resolved
                ? [h('button', { type: 'button', onclick: endThread(c, false) }, 'Reopen')]
                : [h('button', { type: 'button', onclick: endThread(c, true, 'resolved'), title: 'Agreed: something changes' }, 'Resolved'), h('button', { type: 'button', onclick: endThread(c, true, 'noaction'), title: 'Discussed: nothing changes' }, 'No action')];
            talk.append(h('div', { class: 'rv-compose' }, area, h('div', { class: 'row' }, h('span', { style: 'display:flex;gap:6px' }, ...ends), send)));
        }
        node.append(talk);
        return node;
    };
    const categoryNode = (ct, list) => {
        const n = counts(list);
        const fresh = list.reduce((a, c) => a + RV.unreadIn(c), 0);
        const open = openCats.has(ct.id);
        const node = h('div', { class: 'rv-cn' + (ct.demo ? ' demo' : '') + (open ? ' open' : '') });
        const head = h('button', { class: 'rv-cnh', type: 'button' }, h('span', { class: 'tw' }, open ? '▾' : '▸'), h('b', {}, ct.title),
            h('span', { class: 'meta' }, h('span', { class: 'rv-n open' }, `${n.open + (n.rq || 0)} open`), h('span', { class: 'rv-n res' }, `${n.res} resolved`), n.na ? h('span', { class: 'rv-n na' }, `${n.na} no action`) : null, fresh ? h('span', { class: 'rv-new' }, `${fresh} new`) : null));
        head.addEventListener('click', () => { if (open) openCats.delete(ct.id); else openCats.add(ct.id); paint(); });
        node.append(head);
        if (!open) return node;
        const inner = h('div', { class: 'rv-ci' }, h('p', { class: 'rv-hint' }, ct.purpose || ''));
        const sum = ct.summary || {};
        const part = (title, items) => (items && items.length ? h('div', { class: 'rv-sumpart' }, h('div', { class: 'rv-sec' }, title), h('ul', { class: 'rv-sum' }, ...items.map((x) => h('li', {}, ...chips(x))))) : null);
        const parts = [part('Actions', sum.actions), part('Findings', sum.findings), part('Agreements', sum.agreements)].filter(Boolean);
        if (parts.length || (ct.research || []).length) inner.append(h('div', { class: 'rv-roll' }, h('div', { class: 'rv-rolltitle' }, 'What this category has so far'), ...parts,
            (ct.research || []).length ? h('div', {}, h('div', { class: 'rv-sec' }, 'Research'), ...ct.research.map((r) => chipFor('research', r))) : null));
        const sorted = list.slice().sort((a, b) => Number(a.resolved) - Number(b.resolved) || a.created.localeCompare(b.created));
        for (const c of sorted) inner.append(threadNode(c));
        if (!list.length) inner.append(h('p', { class: 'rv-hint' }, 'No threads yet.'));
        inner.append(h('p', { class: 'rv-hint', style: 'margin-top:8px' }, 'Add to this category: tap Add to a category anywhere on the site, tap the evidence, and choose this category.'));
        node.append(inner);
        return node;
    };
    const paintSprint = () => {
        body.replaceChildren();
        const sp = (tracker.sprints || []).find((x) => String(x.n) === current()) || { title: `Sprint ${current()}`, note: '' };
        body.append(h('div', { class: 'rv-sp' }, h('b', {}, sp.title), h('span', { class: 'rv-pill ok' }, 'Open')), h('p', { class: 'rv-hint' }, sp.note || '', ' ', chipFor('manual', '', 'How this works')));
        for (const ct of liveCats()) body.append(categoryNode(ct, threadsIn(current(), ct.id)));
        const loose = threadsIn(current(), null);
        if (loose.length) body.append(categoryNode({ id: '_loose', title: 'Not filed yet', purpose: 'Iris attaches each of these to a category.' }, loose));
        for (const old of (tracker.sprints || []).filter((x) => String(x.n) !== current())) {
            const t = h('button', { class: 'rv-hist', type: 'button' }, `${showHistory ? '▾' : '▸'} ${old.title} · history`);
            t.addEventListener('click', () => { showHistory = !showHistory; paint(); });
            body.append(t);
            if (!showHistory) continue;
            body.append(h('p', { class: 'rv-hint' }, old.note || ''), h('div', {}, chipFor('v1', '', 'Workflow as it was'), ' ', h('a', { class: 'rv-chip', href: links()['data-collection@1'] || 'data-collection.html' }, 'Data collection as it was')));
            for (const c of threadsIn(String(old.n))) body.append(threadNode(c));
        }
        if (focusId) {
            const el = body.querySelector(`[data-thread="${focusId}"]`);
            focusId = null;
            if (el) setTimeout(() => el.scrollIntoView({ block: 'start', behavior: 'smooth' }), 60);
        }
    };
    // Open a thread in the tree, under its category (a pin, a chip or a link).
    const focusThread = (id) => {
        const c = comments().find((x) => x.id === id);
        if (!c) return;
        openCats.add(filed(c) ? c.category : '_loose');
        if (sprintOf(c) !== current()) showHistory = true;
        openThreads.add(id);
        RV.markSeen(id);
        focusId = id;
        openPanel('sprint');
    };
    const paintCategory = () => {};

    // ------------------------------------------------------------------ Iris Chat: general chat with Iris
    const composer = (placeholder, send) => {
        const wrap = h('div', { class: 'rv-compose' });
        if (RV.isPaused()) { wrap.append(h('p', { class: 'rv-hint' }, 'Maintenance pause: Iris Chat opens again shortly.')); return wrap; }
        const nameInput = RV.needName(wrap);
        if (nameInput) nameInput.setAttribute('style', 'display:none;width:100%;box-sizing:border-box;font:inherit;border:2px solid #E9E1D6;border-radius:10px;padding:7px 10px;margin-top:6px');
        const area = h('textarea', { placeholder, maxlength: '4000' });
        const link = h('button', { type: 'button', title: 'Tap a spot on the page to link it here' }, 'Link a spot');
        const go = h('button', { class: 'main', type: 'button' }, 'Send');
        link.addEventListener('click', () => {
            if (linkTarget === area) { stopLinking(); return; }
            linkTarget = area;
            link.classList.add('on');
            link.textContent = 'Tap the page…';
            document.documentElement.classList.add('rv-linking');
            RV.say('Tap the spot on the page you want to link.');
        });
        area._linkBtn = link;
        go.addEventListener('click', async () => {
            const name = nameInput ? nameInput.value.trim() : myName();
            if (!name) { RV.say('Choose who you are first.'); setTimeout(() => RV.say(''), 3000); return; }
            if (!area.value.trim()) { area.focus(); return; }
            localStorage.setItem(RV.NAME_KEY, name);
            go.disabled = true;
            try { await send(name, area.value.trim()); area.value = ''; }
            catch { RV.say('That did not send. The review service may be down; please try again in a little while.'); setTimeout(() => RV.say(''), 5000); }
            go.disabled = false;
            await RV.sync();
        });
        wrap.append(area, h('div', { class: 'row' }, link, go));
        return wrap;
    };
    const stopLinking = () => {
        if (linkTarget && linkTarget._linkBtn) { linkTarget._linkBtn.classList.remove('on'); linkTarget._linkBtn.textContent = 'Link a spot'; }
        linkTarget = null;
        document.documentElement.classList.remove('rv-linking');
        RV.say('');
    };
    const paintIris = () => {
        body.replaceChildren();
        body.append(h('p', { class: 'rv-hint' }, 'Your general chat with Iris, for anything outside a thread: the plan, the research, how to use the review. Iris checks every 10 minutes while a work session is open, otherwise at the next one. Adam can read this chat too. ', chipFor('manual')));
        const msgs = me() ? chatOf(me()) : [];
        body.append(h('div', { class: 'rv-msgs' }, ...msgs.map((m) => h('div', { class: 'rv-msg' + (m.role === 'iris' ? ' iris' : RV.mine(m) ? ' me' : '') },
            h('div', { class: 'who' }, m.role === 'iris' ? 'Iris' : m.name, h('time', {}, when(m.created))), ...chips(m.text)))));
        body.append(composer('Message Iris', (name, text) => RV.api('POST', '/api/review/comments', { page: 'chat', version: '1', route: name.trim().toLowerCase(), anchor: null, parent: null, name, text })));
        markSeen(CHAT_SEEN, 'chat');
        document.getElementById('rv-card')?.remove();
        setTimeout(() => irisBtn.classList.remove('fresh'), 0);
    };

    // ------------------------------------------------------------------ the message card
    const card = () => {
        const msgs = irisUnseen();
        const last = msgs[msgs.length - 1];
        if (!last || cardShownFor === last.id || document.getElementById('rv-card')) return;
        cardShownFor = last.id;
        document.getElementById('rv-hello')?.remove();
        const who = myName();
        const first = who.split(' ')[0];
        const fresh = comments().filter(isThread).reduce((n, x) => n + RV.unreadIn(x), 0);
        const el = h('div', { id: 'rv-card', class: 'rv-ui', role: 'dialog' },
            h('div', { class: 'hd', html: RV.AVATAR + `<span>${RV.esc(first ? first.charAt(0).toUpperCase() + first.slice(1) + ', m' : 'M')}essage from IRIS</span>` }),
            h('div', { class: 'tx' }, ...chips(last.text)),
            msgs.length > 1 ? h('div', { class: 'also' }, `${msgs.length - 1} earlier message${msgs.length > 2 ? 's' : ''} in Iris Chat.`) : null,
            fresh ? h('div', { class: 'also' }, `You also have ${fresh} new repl${fresh === 1 ? 'y' : 'ies'} in your threads.`) : null,
            h('div', { class: 'row' },
                h('button', { type: 'button', onclick: () => { markSeen(CHAT_SEEN, 'chat'); el.remove(); paint(); } }, 'Got it'),
                h('button', { class: 'main', type: 'button', onclick: () => { el.remove(); openPanel('iris'); } }, 'Open Iris Chat')));
        document.body.append(el);
    };

    // ------------------------------------------------------------------ start
    const loadTracker = async () => {
        try { tracker = await RV.api('GET', '/api/review/tracker'); } catch { /* waits for the service */ }
        RV.render();
    };
    const fromQuery = () => {
        const q = new URLSearchParams(location.search);
        const clean = () => history.replaceState(null, '', location.pathname + location.hash);
        if (q.get('thread')) { RV.openThread(q.get('thread')); focusThread(q.get('thread')); clean(); }
        else if (q.get('category') || q.get('item')) { openCategory((catById(q.get('category') || q.get('item')) || {}).id || null); clean(); }
        else if (q.get('chat')) { openPanel('iris'); clean(); }
        else if (q.get('spot')) { const s = spotOf(q.get('spot')); setTimeout(() => flashAt(s.anchor), 400); clean(); }
    };

    window.RVX = {
        chips, plain, threadHead, listTag, categoryPicker, focusThread: (id) => focusThread(id),
        openItem: (id) => openCategory((catById(id) || {}).id || null),
        // A live page shows only the current sprint's threads; an earlier sprint's page shows its own as they were.
        visible: (c) => (RV && RV.CFG.archived ? true : sprintOf(c) === current()),
        render: () => {
            if (firstLoad && comments().length) { firstLoad = false; fromQuery(); }
            paint();
            card();
        },
        start: () => {
            RV = window.RV;
            document.head.append(h('style', {}, css));
            body = h('div', { class: 'rv-rbody' });
            tabsEl = h('div', { class: 'rv-tabs' });
            irisBtn = h('button', { class: 'iris', title: 'Iris Chat' });
            const header = RV.panel.querySelector('header');
            header.firstChild.replaceWith(tabsEl);
            RV.panel.insertBefore(body, RV.panelBody.nextSibling);
            // The sprint button opens the categories, on every page.
            sprintBtn = RV.bar.querySelector('.all[href="#sprints"]');
            if (!sprintBtn) { sprintBtn = h('button', { class: 'sprint', type: 'button' }); RV.bar.querySelector('.add').before(sprintBtn); }
            sprintBtn.addEventListener('click', (ev) => { ev.preventDefault(); if (RV.panel.classList.contains('open') && tab === 'sprint' && !openCat) RV.panel.classList.remove('open'); else openCategory(null); });
            RV.bar.querySelector('.list').after(irisBtn);
            irisBtn.addEventListener('click', () => { if (RV.panel.classList.contains('open') && tab === 'iris') RV.panel.classList.remove('open'); else openPanel('iris'); });
            document.addEventListener('click', (ev) => {
                if (!linkTarget || RV.isUi(ev.target)) return;
                ev.preventDefault();
                ev.stopPropagation();
                const target = ev.target.nodeType === 1 ? ev.target : ev.target.parentElement;
                const r = target.getBoundingClientRect();
                const fx = r.width ? Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)).toFixed(3) : 0;
                const fy = r.height ? Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height)).toFixed(3) : 0;
                const area = linkTarget;
                area.value = (area.value ? area.value.replace(/\s*$/, ' ') : '') + `[[spot:${RV.route()}~${RV.pathOf(target)}~${fx}~${fy}~${RV.CFG.page || ''}]] `;
                stopLinking();
                area.focus();
            }, true);
            addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && linkTarget) stopLinking(); });
            loadTracker();
            setInterval(loadTracker, 60000);
        },
    };
    if (window.RV) window.RVX.start();
})();
