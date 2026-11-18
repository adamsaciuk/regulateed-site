// RegulateED review rounds (Adam, 2026-11-18): the review runs in rounds. Comments are filed as
// numbered tracker items (R1-03), each with its own link and collaboration chat; links in any
// message become chips that open what they point at; every reader has an Iris Chat, and a message
// card greets them when Iris has written. Loaded after review.js, which hands over window.RV.
(function () {
    'use strict';
    let RV = null;
    let tracker = { round: 1, state: 'open', items: [] };
    let tab = 'comments';
    let openId = null;
    let linkTarget = null;
    let firstLoad = true;
    let cardShownFor = '';
    const CHAT_SEEN = 'rv-chat-seen';
    const ITEM_SEEN = 'rv-item-seen';
    const TOKEN = /\[\[([a-z0-9]+)(?::([^\]|]*))?(?:\|([^\]]*))?\]\]/g;
    const STATUS = {
        call: ['Needs a decision', 'call'], asked: ['Iris asked you', 'asked'], research: ['Needs research', 'research'],
        answered: ['Answered', 'ok'], agreed: ['Agreed', 'ok'], parked: ['Parked', 'grey'], done: ['Done', 'done'],
    };
    const ORDER = ['call', 'asked', 'research', 'answered', 'agreed', 'parked', 'done'];

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
    `;

    // ------------------------------------------------------------------ helpers
    const h = (...a) => RV.h(...a);
    const me = () => RV.me();
    const myName = () => localStorage.getItem(RV.NAME_KEY) || '';
    const when = (iso) => new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    const comments = () => RV.comments();
    const links = () => (RV.CFG.links || {});
    const onCurrent = () => !!RV.CFG.page && !RV.CFG.archived && RV.CFG.page === (links().currentPage || RV.CFG.page) && (RV.CFG.file || 'index.html') === (links().current || 'index.html');
    const itemById = (id) => tracker.items.find((x) => x.id === id);
    const itemOfThread = (id) => tracker.items.find((x) => (x.threads || []).includes(id));
    const seen = (key) => { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; } };
    const markSeen = (key, id) => { const m = seen(key); m[id] = new Date().toISOString(); localStorage.setItem(key, JSON.stringify(m)); };
    const chatOf = (who) => comments().filter((c) => c.page === 'chat' && c.route === who).sort((a, b) => a.created.localeCompare(b.created));
    const itemChat = (id) => comments().filter((c) => c.page === 'item' && c.route === id).sort((a, b) => a.created.localeCompare(b.created));
    const irisUnseen = () => { const s = seen(CHAT_SEEN).chat || ''; return chatOf(me()).filter((c) => c.role === 'iris' && c.created > s); };
    const itemFresh = (id) => {
        const msgs = itemChat(id);
        if (!msgs.some((m) => RV.mine(m))) return 0;
        const s = seen(ITEM_SEEN)[id] || '';
        return msgs.filter((m) => !RV.mine(m) && m.created > s).length;
    };

    // A place on the review: on the current workflow it moves there; anywhere else it opens the current workflow there.
    const goRoute = (route, extra) => {
        if (onCurrent()) { location.hash = route; if (extra) setTimeout(extra, 160); return; }
        location.href = (links().current || 'index.html') + (extra && extra.query ? extra.query : '') + '#' + route;
    };
    const flashAt = (anchor) => {
        const p = RV.pointOf(anchor);
        if (!p) { RV.say('That spot is not on this version of the page any more.'); setTimeout(() => RV.say(''), 3000); return; }
        scrollTo({ top: Math.max(0, p.y - innerHeight / 3), behavior: 'smooth' });
        const ring = h('div', { class: 'rv-ring' });
        ring.style.left = p.x + 'px';
        ring.style.top = p.y + 'px';
        document.body.append(ring);
        setTimeout(() => ring.remove(), 3200);
    };
    const spotOf = (arg) => {
        const [route, path, fx, fy] = String(arg || '').split('~');
        return { route: route || '', anchor: path ? { path, fx: Number(fx) || 0, fy: Number(fy) || 0 } : null };
    };

    // ------------------------------------------------------------------ chips
    // [[item:R1-03]] [[research:faces]] [[page:collect/grade/G3]] [[thread:<id>]] [[spot:<route>~<path>~fx~fy]]
    // [[v1:<route>]] [[manual]] [[chat]] [[tracker]], each with an optional |label.
    const chipFor = (kind, arg, label) => {
        const research = window.reviewResearch || {};
        const make = (cls, k, text, act) => {
            const b = h('button', { class: 'rv-chip ' + cls, type: 'button' }, k ? h('span', { class: 'k' }, k) : null, text);
            b.addEventListener('click', (ev) => { ev.stopPropagation(); ev.preventDefault(); act(); });
            return b;
        };
        switch (kind) {
            case 'item': { const it = itemById(arg); return make('ck-item', arg, label || (it ? it.topic : 'Tracker item'), () => openTracker(arg)); }
            case 'research': return make('ck-research', 'Research', label || research[arg] || arg, () => goRoute('foundations/research/' + arg));
            case 'page': return make('', 'Page', label || RV.routeName(arg), () => goRoute(arg));
            case 'thread': return make('', 'Thread', label || 'Open the thread', () => {
                if (!RV.openThread(arg)) location.href = (links().current || 'index.html') + '?thread=' + encodeURIComponent(arg);
            });
            case 'spot': { const s = spotOf(arg); return make('', 'Spot', label || RV.routeName(s.route), () => {
                if (onCurrent()) { location.hash = s.route; setTimeout(() => flashAt(s.anchor), 300); }
                else location.href = (links().current || 'index.html') + '?spot=' + encodeURIComponent(arg) + '#' + s.route;
            }); }
            case 'v1': return make('', 'Version 1', label || 'As it was in v1', () => { location.href = (links()['workflow@1'] || 'workflow-v1.html') + '#' + arg; });
            case 'manual': return make('', '', label || 'The review manual', () => { location.href = links().manual || 'manual.html'; });
            case 'chat': return make('', '', label || 'Iris Chat', () => openPanel('iris'));
            case 'tracker': return make('ck-item', '', label || `Round ${tracker.round} tracker`, () => openTracker(null));
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
    const plain = (text) => String(text).replace(TOKEN, (_, k, a, l) => (l || (k === 'item' ? a : k === 'research' ? 'research' : 'link')));

    // ------------------------------------------------------------------ thread state
    const threadHead = (c) => {
        if (c.page === 'chat' || c.page === 'item') return null;
        const it = itemOfThread(c.id);
        if (it) return h('div', { class: 'rv-state' }, h('b', {}, 'On the tracker: '), chipFor('item', it.id), h('br'), 'The conversation carries on at the item.');
        const replies = RV.repliesOf(c);
        const lastReply = replies[replies.length - 1];
        if (!c.resolved && lastReply && lastReply.role === 'iris' && lastReply.text.includes('?')) return h('div', { class: 'rv-state asked' }, h('b', {}, 'Iris asked you a question. '), 'Reply below.');
        return null;
    };
    const listTag = (c) => {
        const it = itemOfThread(c.id);
        if (it) return h('span', { class: 'rv-tag item' }, it.id);
        const replies = RV.repliesOf(c);
        const lastReply = replies[replies.length - 1];
        if (!c.resolved && lastReply && lastReply.role === 'iris' && lastReply.text.includes('?')) return h('span', { class: 'rv-tag asked' }, 'Iris asked you');
        return null;
    };

    // ------------------------------------------------------------------ panel tabs
    // Made in start(), once review.js has handed over its helpers.
    let body = null;
    let tabsEl = null;
    let irisBtn = null;
    const openPanel = (which) => { tab = which; RV.closePop(); RV.panel.classList.add('open'); paint(); };
    const openTracker = (id) => { openId = id; if (id) markSeen(ITEM_SEEN, id); openPanel('tracker'); };
    const paint = () => {
        const panel = RV.panel;
        const fresh = irisUnseen().length;
        tabsEl.replaceChildren(...[['comments', 'Comments'], ['tracker', `Round ${tracker.round}`], ['iris', 'Iris Chat']].map(([k, t]) => {
            const b = h('button', { class: tab === k ? 'on' : '', type: 'button' }, t, k === 'iris' && fresh ? h('span', { class: 'dot' }) : null);
            b.addEventListener('click', () => { tab = k; if (k !== 'tracker') openId = null; paint(); });
            return b;
        }));
        irisBtn.replaceChildren(h('span', { class: 'rv-avatar', html: RV.AVATAR }), 'Iris');
        irisBtn.classList.toggle('fresh', !!fresh);
        panel.classList.toggle('wide', tab !== 'comments');
        RV.panelBody.style.display = tab === 'comments' ? '' : 'none';
        body.style.display = tab === 'comments' ? 'none' : '';
        if (tab === 'tracker') paintTracker();
        if (tab === 'iris') paintIris();
    };

    const composer = (placeholder, send) => {
        const wrap = h('div', { class: 'rv-compose' });
        if (RV.isPaused()) { wrap.append(h('p', { class: 'rv-hint' }, 'Maintenance pause: messages open again shortly.')); return wrap; }
        let nameInput = null;
        if (!myName()) { nameInput = h('input', { placeholder: 'Your name', maxlength: '60', style: 'width:100%;box-sizing:border-box;font:inherit;border:2px solid #E9E1D6;border-radius:10px;padding:7px 10px;margin-bottom:6px' }); wrap.append(nameInput); }
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
            if (!name) { nameInput.focus(); return; }
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
    const post = (page, route, name, text) => RV.api('POST', '/api/review/comments', { page, version: '1', route, anchor: null, parent: null, name, text });
    const msgList = (msgs) => h('div', { class: 'rv-msgs' }, ...msgs.map((m) => h('div', { class: 'rv-msg' + (m.role === 'iris' ? ' iris' : RV.mine(m) ? ' me' : '') },
        h('div', { class: 'who' }, m.role === 'iris' ? 'Iris' : m.name, h('time', {}, when(m.created))), ...chips(m.text))));

    // ------------------------------------------------------------------ tracker
    const paintTracker = () => {
        body.replaceChildren();
        const it = openId && itemById(openId);
        if (!it) {
            body.append(h('p', { class: 'rv-hint' }, `Round ${tracker.round}: every comment is filed as an item. We talk the items through, Adam decides, and the next version is built from them. `, chipFor('manual', '', 'How this works')));
            if (!tracker.items.length) { body.append(h('p', { class: 'rv-hint' }, 'No items yet.')); return; }
            for (const st of ORDER) {
                const list = tracker.items.filter((x) => x.status === st);
                if (!list.length) continue;
                body.append(h('div', { class: 'rv-sec' }, STATUS[st][0]));
                for (const x of list) {
                    const b = h('button', { class: 'rv-it', type: 'button' }, h('span', { class: 'id' }, x.id), h('b', {}, x.topic),
                        h('div', { class: 'meta' }, `${(x.threads || []).length} comment${(x.threads || []).length === 1 ? '' : 's'}`,
                            itemChat(x.id).length ? ` · ${itemChat(x.id).length} in chat` : '', x.research ? ' · research' : '',
                            itemFresh(x.id) ? h('span', { class: 'rv-new' }, `${itemFresh(x.id)} new`) : null));
                    b.addEventListener('click', () => openTracker(x.id));
                    body.append(b);
                }
            }
            return;
        }
        const back = h('button', { class: 'rv-back', type: 'button' }, `← Round ${tracker.round} tracker`);
        back.addEventListener('click', () => { openId = null; paint(); });
        body.append(back, h('h3', { style: 'margin:6px 0 4px;font-size:19px' }, h('span', { style: 'color:#E0703F' }, it.id + ' '), it.topic),
            h('span', { class: 'rv-pill ' + STATUS[it.status][1] }, STATUS[it.status][0]),
            h('div', { class: 'rv-sec' }, 'What we understood'), h('div', { class: 'rv-box' }, ...chips(it.summary || '')));
        body.append(h('div', { class: 'rv-sec' }, 'Decision'), h('div', { class: 'rv-box' }, it.decision ? h('span', {}, ...chips(it.decision)) : h('i', {}, 'Not decided yet. Adam decides at the talk-through.')));
        if (it.pitch) body.append(h('div', { class: 'rv-sec' }, 'In the pitch'), h('div', { class: 'rv-box' }, ...chips(it.pitch)));
        const refs = [...(it.research ? [`[[research:${it.research}]]`] : []), ...(it.links || [])];
        if (refs.length) body.append(h('div', { class: 'rv-sec' }, 'Evidence and links'), h('div', {}, ...refs.flatMap((t) => chips(t))));
        const said = it.said || [];
        if (said.length) {
            body.append(h('div', { class: 'rv-sec' }, 'What was said'));
            for (const s of said) body.append(h('div', { class: 'rv-box quote' }, h('div', { class: 'who' }, `${s.role === 'iris' ? 'Iris' : s.name} · ${when(s.created)}`),
                plain(s.text).length > 260 ? plain(s.text).slice(0, 260) + '…' : plain(s.text), s.thread ? h('div', { style: 'margin-top:4px' }, chipFor('thread', s.thread)) : null));
        }
        body.append(h('div', { class: 'rv-sec' }, 'Collaboration chat'), h('p', { class: 'rv-hint' }, 'Talk this item through here: you, Adam and Iris.'));
        body.append(msgList(itemChat(it.id)), composer(`Write about ${it.id}`, (name, text) => post('item', it.id, name, text)));
        markSeen(ITEM_SEEN, it.id);
    };

    // ------------------------------------------------------------------ Iris Chat
    const paintIris = () => {
        body.replaceChildren();
        const who = me();
        body.append(h('p', { class: 'rv-hint' }, 'Ask Iris anything about the plan, the research or how to use the review. Iris checks for new messages every 10 minutes while a work session is open, otherwise at the next one, so answers are not instant. Adam can read this chat too. ', chipFor('manual')));
        if (who) body.append(msgList(chatOf(who)));
        body.append(composer('Message Iris', (name, text) => post('chat', name.trim().toLowerCase(), name, text)));
        markSeen(CHAT_SEEN, 'chat');
        document.getElementById('rv-card')?.remove();
        setTimeout(() => { irisBtn.classList.remove('fresh'); }, 0);
    };

    // ------------------------------------------------------------------ the message card
    const card = () => {
        const msgs = irisUnseen();
        const last = msgs[msgs.length - 1];
        if (!last || cardShownFor === last.id || document.getElementById('rv-card')) return;
        cardShownFor = last.id;
        document.getElementById('rv-hello')?.remove();
        const who = myName();
        const fresh = comments().filter((x) => !x.parent && x.page !== 'chat' && x.page !== 'item').reduce((n, x) => n + RV.unreadIn(x), 0);
        const el = h('div', { id: 'rv-card', class: 'rv-ui', role: 'dialog' },
            h('div', { class: 'hd', html: RV.AVATAR + `<span>${RV.esc(who ? who.charAt(0).toUpperCase() + who.slice(1) + ', m' : 'M')}essage from IRIS</span>` }),
            h('div', { class: 'tx' }, ...chips(last.text)),
            msgs.length > 1 ? h('div', { class: 'also' }, `${msgs.length - 1} earlier message${msgs.length > 2 ? 's' : ''} in Iris Chat.`) : null,
            fresh ? h('div', { class: 'also' }, `You also have ${fresh} new repl${fresh === 1 ? 'y' : 'ies'} in your comments.`) : null,
            h('div', { class: 'row' },
                h('button', { type: 'button', onclick: () => { markSeen(CHAT_SEEN, 'chat'); el.remove(); paint(); } }, 'Got it'),
                h('button', { class: 'main', type: 'button', onclick: () => { el.remove(); openPanel('iris'); } }, 'Open Iris Chat')));
        document.body.append(el);
    };

    // ------------------------------------------------------------------ start
    const loadTracker = async () => {
        try { tracker = await RV.api('GET', '/api/review/tracker'); } catch { /* the tracker waits for the service */ }
        if (RV.panel.classList.contains('open') && tab !== 'comments') paint();
    };
    const fromQuery = () => {
        const q = new URLSearchParams(location.search);
        const clean = () => history.replaceState(null, '', location.pathname + location.hash);
        if (q.get('thread')) { if (RV.openThread(q.get('thread'))) clean(); }
        else if (q.get('item')) { openTracker(q.get('item')); clean(); }
        else if (q.get('chat')) { openPanel('iris'); clean(); }
        else if (q.get('spot')) { const s = spotOf(q.get('spot')); setTimeout(() => flashAt(s.anchor), 400); clean(); }
    };

    window.RVX = {
        chips, plain, threadHead, listTag, openItem: (id) => openTracker(id),
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
            const list = RV.bar.querySelector('.list');
            list.addEventListener('click', () => { tab = 'comments'; openId = null; paint(); });
            list.after(irisBtn);
            irisBtn.addEventListener('click', () => { if (RV.panel.classList.contains('open') && tab === 'iris') RV.panel.classList.remove('open'); else openPanel('iris'); });
            // Link a spot: the next tap on the page (not on the review tools) becomes a spot link in the message.
            document.addEventListener('click', (ev) => {
                if (!linkTarget || RV.isUi(ev.target)) return;
                ev.preventDefault();
                ev.stopPropagation();
                const target = ev.target.nodeType === 1 ? ev.target : ev.target.parentElement;
                const r = target.getBoundingClientRect();
                const fx = r.width ? Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)).toFixed(3) : 0;
                const fy = r.height ? Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height)).toFixed(3) : 0;
                const area = linkTarget;
                area.value = (area.value ? area.value.replace(/\s*$/, ' ') : '') + `[[spot:${RV.route()}~${RV.pathOf(target)}~${fx}~${fy}]] `;
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
