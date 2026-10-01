/* dyplomna.com — redesign v3 — interactions & animations
   GSAP + ScrollTrigger (scrub effects), Swiper (sliders). Everything degrades
   gracefully: if a library fails to load the content is still fully visible. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined';

  /* ------------------------------------------ about: looping background video */
  $$('[data-about-video]').forEach((v) => {
    const sec = v.closest('.sec') || v;
    let inView = false;
    const play = () => { if (!inView || reduceMotion || document.hidden) return; const p = v.play(); if (p && p.catch) p.catch(() => {}); };
    const pause = () => { if (!v.paused) v.pause(); };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((en) => { inView = en[0].isIntersecting; inView ? play() : pause(); }, { threshold: .05 }).observe(sec);
    } else { inView = true; play(); }
    document.addEventListener('visibilitychange', () => (document.hidden ? pause() : play()));
  });

  /* ------------------------------------------ advantages: accordion + photo */
  $$('[data-acc]').forEach((list) => {
    const sec = list.closest('.sec');
    if (!sec) return;
    const btns = $$('[data-acc-btn]', list);
    const items = $$('[data-acc-item]', list);
    const imgs = $$('[data-adv-img]', sec); // <video> clips (a plain <img> still works: it is only toggled)
    const playMedia = (i) => {
      imgs.forEach((v, k) => {
        if (v.tagName !== 'VIDEO') return;
        if (k === i && !reduceMotion && !document.hidden) {
          try { if (v.readyState > 0) v.currentTime = 0; } catch (e) { /* not loaded yet */ }
          const p = v.play();
          if (p && p.catch) p.catch(() => {});
        } else if (!v.paused) v.pause();
      });
    };
    const pauseMedia = () => imgs.forEach((v) => { if (v.tagName === 'VIDEO' && !v.paused) v.pause(); });
    const badge = $('[data-adv-badge-text]', sec);
    const badgeIc = $('.adv__badge-ic', sec);
    const g = hasGsap && !reduceMotion ? window.gsap : null;
    let cur = 0;
    let touched = false;
    const setBody = (i, open) => {
      const body = $('.accord__body', items[i]);
      btns[i].setAttribute('aria-expanded', String(open));
      items[i].classList.toggle('is-open', open);
      if (!body) return;
      if (!g) { body.hidden = !open; return; }
      g.killTweensOf(body);
      if (open) {
        body.hidden = false;
        g.fromTo(body, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: .55, ease: 'power3.out', clearProps: 'height,opacity' });
      } else {
        g.to(body, { height: 0, opacity: 0, duration: .35, ease: 'power2.in', onComplete: () => { body.hidden = true; g.set(body, { clearProps: 'height,opacity' }); } });
      }
    };
    // phones: the list is a deck - the open card sits on top; the previous one dives under the others to the
    // bottom while the rest slide up (FLIP: measure, reorder the DOM, animate from the old positions)
    const mq = window.matchMedia('(max-width: 940px)');
    const order = items.slice();
    const rotateTo = (i, prev) => {
      const before = new Map(items.map((it) => [it, it.getBoundingClientRect().top]));
      const prevBody = prev !== i ? $('.accord__body', items[prev]) : null;
      const prevH = prevBody && !prevBody.hidden ? prevBody.offsetHeight : 0;
      items.forEach((it, k) => {
        const body = $('.accord__body', it);
        const open = k === i;
        it.classList.toggle('is-open', open);
        btns[k].setAttribute('aria-expanded', String(open));
        if (body) { if (g) g.killTweensOf(body); body.hidden = !open; if (g) g.set(body, { clearProps: 'height,opacity' }); }
      });
      list.prepend(items[i]);
      if (prev !== i) list.append(items[prev]);
      if (!g) return;
      // the leaving card keeps its text for a moment and folds it while it dives - otherwise the dive is a snap
      if (prevBody && prevH) {
        prevBody.hidden = false;
        g.fromTo(prevBody, { height: prevH, opacity: 1 }, { height: 0, opacity: 0, duration: .4, ease: 'power2.in', onComplete: () => { prevBody.hidden = true; g.set(prevBody, { clearProps: 'height,opacity' }); } });
      }
      items.forEach((it) => {
        const dy = before.get(it) - it.getBoundingClientRect().top;
        if (!dy) return;
        if (it === items[prev] && prev !== i) {
          // the dive: under the other cards (z-index) - the card turns navy (.is-flying) and shifts a little to the
          // left on the way, so its edge shows from under the deck and through the gaps; white again at the bottom
          it.classList.add('is-flying');
          const tl = g.timeline({ onComplete: () => { it.classList.remove('is-flying'); g.set(it, { clearProps: 'transform' }); } });
          tl.fromTo(it, { y: dy }, { y: 0, duration: .9, ease: 'power3.inOut' }, 0)
            .to(it, { x: -24, duration: .45, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0);
          return;
        }
        g.fromTo(it, { y: dy }, { y: 0, duration: .9, ease: 'power3.inOut', clearProps: 'transform' });
      });
      const inner = $('.accord__inner', items[i]);
      if (inner) g.fromTo(inner, { opacity: 0 }, { opacity: 1, duration: .5, delay: .35, clearProps: 'opacity' });
    };
    if (mq.addEventListener) mq.addEventListener('change', () => { if (!mq.matches) order.forEach((it) => { list.append(it); it.classList.remove('is-flying'); }); });
    const show = (i) => {
      if (i === cur || !items[i]) return;
      const prev = cur;
      cur = i;
      if (mq.matches) rotateTo(i, prev);
      else { setBody(prev, false); setBody(i, true); }
      imgs.forEach((im, k) => im.classList.toggle('is-on', k === i));
      if (inView) playMedia(i);
      if (badge) {
        const t = btns[i].querySelector('.accord__title');
        const ic = btns[i].querySelector('.accord__ic');
        badge.textContent = t ? t.textContent : '';
        if (badgeIc && ic) badgeIc.innerHTML = ic.innerHTML;
        if (g) g.fromTo(badge.parentElement, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: .5, ease: 'power3.out', clearProps: 'transform,opacity' });
      }
    };
    let timer = null;
    let inView = false;
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    const start = () => { if (!timer && inView && !touched && !document.hidden && !reduceMotion) timer = setInterval(() => show((cur + 1) % btns.length), 6000); };
    btns.forEach((b, i) => b.addEventListener('click', () => {
      if (mq.matches) { stop(); show(i === cur ? (cur + 1) % btns.length : i); start(); return; } // a tap on the open card = next
      touched = true; stop(); show(i);
    }));
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((en) => { inView = en[0].isIntersecting; if (inView) { start(); playMedia(cur); } else { stop(); pauseMedia(); } }, { threshold: .3 }).observe(sec);
    } else { inView = true; playMedia(cur); }
    document.addEventListener('visibilitychange', () => { if (document.hidden) { stop(); pauseMedia(); } else { start(); if (inView) playMedia(cur); } });
    list.__acc = { show, start, stop, play: () => playMedia(cur) }; // debug hook
  });

  /* ------------------- "just ask": floating bubbles (desktop) / a Telegram-like chat unfolding (phones, <= 720 px) */
  $$('[data-ask]').forEach((sec) => {
    const bubbles = $$('.bubble', sec);
    if (!bubbles.length || !hasGsap || reduceMotion) return;
    const g = window.gsap;
    const greet = $('.tg__row--greet', sec);
    const msg = $('[data-tg-msg]', sec);
    const typing = $('[data-tg-typing]', sec);
    const text = $('[data-tg-text]', sec);
    const status = $('[data-tg-status]', sec);
    const time = $('[data-tg-time]', sec);
    const chat = window.matchMedia('(max-width: 720px)').matches && greet && msg && typing && text;
    if (chat) {
      typing.hidden = false; text.hidden = true; // the markup's resting state is the finished chat (no-JS / reduced motion)
      g.set(greet, { autoAlpha: 0, y: 12 });
      g.set(msg, { autoAlpha: 0, y: 8 });
      g.set(bubbles, { autoAlpha: 0, y: 10, scale: .92 });
    } else g.set(bubbles, { autoAlpha: 0, y: 26, scale: .9 });
    let played = false;
    const play = () => {
      if (played) return;
      played = true;
      if (chat) {
        // the greeting arrives, "typing…", the question pops in, then the request buttons one after another
        const tl = g.timeline({ delay: .2 });
        tl.to(greet, { autoAlpha: 1, y: 0, duration: .5, ease: 'power3.out' }, 0)
          .add(() => { if (status) status.textContent = status.dataset.typing || ''; }, .7)
          .to(msg, { autoAlpha: 1, y: 0, duration: .35, ease: 'power2.out' }, .8)
          .add(() => {
            typing.hidden = true; text.hidden = false;
            if (status) status.textContent = status.dataset.online || '';
            if (time) { try { time.textContent = new Date().toLocaleTimeString(document.documentElement.lang || 'en', { hour: '2-digit', minute: '2-digit', numberingSystem: 'latn' }); } catch (e) { time.textContent = ''; } }
          }, 2.1)
          .fromTo(msg, { scale: .9, transformOrigin: '0% 100%' }, { scale: 1, duration: .4, ease: 'back.out(1.7)', clearProps: 'transform' }, 2.1)
          .to(bubbles, { autoAlpha: 1, y: 0, scale: 1, duration: .45, stagger: .14, ease: 'back.out(1.5)' }, 2.6);
        return;
      }
      g.to(bubbles, { autoAlpha: 1, y: 0, scale: 1, duration: .7, stagger: .32, ease: 'back.out(1.6)', delay: .3 }); // no drift afterwards (owner, 14.09.2026)
    };
    sec.__ask = { play }; // debug hook
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((en) => { if (en[0].isIntersecting) play(); }, { threshold: .35 }).observe(sec);
    } else play();
  });

  /* --------------------------------------------------------- tilt tiles */
  if (window.matchMedia('(pointer: fine)').matches && !reduceMotion) {
    $$('[data-tilt]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5;
        const y = (e.clientY - r.top) / r.height - .5;
        el.style.setProperty('--rx', (-y * 8).toFixed(2) + 'deg');
        el.style.setProperty('--ry', (x * 10).toFixed(2) + 'deg');
        el.style.setProperty('--gx', ((x + .5) * 100).toFixed(1) + '%');
        el.style.setProperty('--gy', ((y + .5) * 100).toFixed(1) + '%');
        el.classList.add('is-tilt');
      });
      el.addEventListener('pointerleave', () => { el.classList.remove('is-tilt'); el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
    });
  }

  const hasST = hasGsap && typeof window.ScrollTrigger !== 'undefined';
  if (hasST) window.gsap.registerPlugin(window.ScrollTrigger);
  if (hasGsap && typeof window.ScrollToPlugin !== 'undefined') window.gsap.registerPlugin(window.ScrollToPlugin);
  const LOCALE = (document.documentElement.lang || 'en') + '-u-nu-latn'; // Western digits in every language

  /* ------------------------------------------------------------ header */
  const hdr = $('#hdr');
  const onScroll = () => { if (hdr) hdr.classList.toggle('is-scrolled', window.scrollY > 24); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* -------------------------------------------------------- mobile menu */
  const burger = $('.burger');
  const mnav = $('#mobileMenu');
  const setMenu = (open) => {
    if (!mnav || !burger) return;
    if (open) mnav.hidden = false;
    requestAnimationFrame(() => {
      mnav.classList.toggle('is-open', open);
      document.documentElement.classList.toggle('menu-open', open);
      // a modal may have taken the scroll lock over in the meantime (this runs a frame late), so never release it here
      if (open || !document.querySelector('[data-modal]:not([hidden])')) document.documentElement.classList.toggle('overflow-hidden', open);
      burger.setAttribute('aria-expanded', String(open));
    });
    if (!open) setTimeout(() => { if (!mnav.classList.contains('is-open')) mnav.hidden = true; }, 450);
  };
  burger?.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  mnav?.addEventListener('click', (e) => {
    if (e.target.closest('a') || e.target.closest('[data-close-menu]')) setMenu(false);
  });
  window.addEventListener('resize', () => { if (window.innerWidth > 960) setMenu(false); });

  /* ------------------------------------------------- language dropdown */
  const dds = $$('details.lang__dd');
  dds.forEach((dd) => {
    dd.addEventListener('toggle', () => {
      if (dd.open) dds.forEach((o) => { if (o !== dd) o.open = false; });
    });
  });
  document.addEventListener('click', (e) => {
    dds.forEach((dd) => { if (dd.open && !dd.contains(e.target)) dd.open = false; });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    dds.forEach((dd) => {
      if (!dd.open) return;
      const inside = dd.contains(document.activeElement);
      dd.open = false;
      if (inside) { const s = dd.querySelector('summary'); if (s) s.focus(); } // keep keyboard focus on the toggle
    });
  });
  // the search box above the languages: typing filters the list; the field is focused on open (mouse users only,
  // on a phone that would pop the keyboard), and the filter is cleared when the dropdown closes
  dds.forEach((dd) => {
    const q = dd.querySelector('[data-lang-q]');
    if (!q) return;
    const items = $$('.lang__list li', dd);
    const filter = () => {
      const v = q.value.trim().toLowerCase();
      items.forEach((li) => { const a = li.querySelector('a'); const t = (li.textContent + ' ' + (a ? a.getAttribute('data-en') || '' : '')).toLowerCase(); li.hidden = !!v && !t.includes(v); });
    };
    q.addEventListener('input', filter);
    q.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const first = items.find((li) => !li.hidden); const a = first && first.querySelector('a'); if (a) a.click(); } });
    dd.addEventListener('toggle', () => {
      if (dd.open) { if (window.matchMedia('(pointer: fine)').matches) requestAnimationFrame(() => q.focus({ preventScroll: true })); }
      else { q.value = ''; filter(); }
    });
  });
  // close a dropdown when keyboard focus leaves it (otherwise it stays open over the content below)
  dds.forEach((dd) => dd.addEventListener('focusout', (e) => {
    if (dd.open && e.relatedTarget && !dd.contains(e.relatedTarget)) dd.open = false;
  }));

  /* ------------------------------------------------ mobile menu: language search (50 languages, 29.09.2026) */
  $$('[data-lang-box]').forEach((box) => {
    const q = box.querySelector('[data-lang-q]');
    const items = $$('.mnav__langs li', box);
    if (!q || !items.length) return;
    const text = (li) => { const a = li.querySelector('a'); return (li.textContent + ' ' + (a ? a.getAttribute('data-en') || '' : '')).toLowerCase(); };
    q.addEventListener('input', () => { const v = q.value.trim().toLowerCase(); items.forEach((li) => { li.hidden = !!v && !text(li).includes(v); }); });
  });

  /* ------------------------------------------------ footer: back to top */
  $$('[data-to-top]').forEach((b) => b.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    const skip = $('.hdr a, .hdr button');
    if (skip) setTimeout(() => skip.focus({ preventScroll: true }), reduceMotion ? 0 : 600);
  }));

  /* --------------------------------------------------------------- modal */
  (() => {
    const lastActive = new WeakMap();
    const lockScroll = (on) => document.documentElement.classList.toggle('overflow-hidden', on);
    const openEl = (root) => {
      if (!(root instanceof HTMLElement)) return;
      lastActive.set(root, document.activeElement instanceof HTMLElement ? document.activeElement : null);
      root.hidden = false;
      root.setAttribute('aria-hidden', 'false');
      lockScroll(true);
      const dlg = root.querySelector('[role="dialog"]');
      requestAnimationFrame(() => {
        const first = root.querySelector('input:not([type="hidden"]):not([type="radio"]), textarea, button');
        (first || dlg)?.focus();
      });
    };
    const closeEl = (root) => {
      if (!(root instanceof HTMLElement)) return;
      root.hidden = true;
      root.setAttribute('aria-hidden', 'true');
      lockScroll(false);
      lastActive.get(root)?.focus?.();
    };
    $$('[data-modal]').forEach((root) => {
      root.addEventListener('click', (ev) => {
        const el = ev.target instanceof Element ? ev.target : null;
        if (!el) return;
        if (el.closest('[data-close]') || el.closest('[data-backdrop]')) closeEl(root);
      });
    });
    document.addEventListener('click', (e) => {
      const link = e.target instanceof Element ? e.target.closest('[data-modal-link]') : null;
      if (!link) return;
      const id = (link.getAttribute('href') || '').replace(/^#/, '');
      const root = document.getElementById(id);
      if (!root) return;
      e.preventDefault();
      setMenu(false);
      const topic = link.getAttribute('data-topic'); // e.g. a request pill of the editing block: pre-fill the message
      if (topic) $$('textarea[name="message"]', root).forEach((ta) => { if (!ta.value) ta.value = topic; });
      openEl(root);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      $$('[data-modal]').forEach((root) => { if (!root.hidden) closeEl(root); });
    });
    // open automatically when the page loads with #modal-leadform in the URL
    if (location.hash === '#modal-leadform') {
      const root = document.getElementById('modal-leadform');
      if (root) setTimeout(() => openEl(root), 300);
    }
  })();

  /* ---------------------------------------------------- UTM persistence
     Stored in localStorage only with marketing consent (cookie banner, 01.10.2026); without it the order form still
     sends the UTM tags of the page it is sent from. consent.js calls window.dypStoreUtms() when consent is given. */
  (() => {
    const current = () => {
      const utms = {};
      try {
        const params = new URLSearchParams(location.search);
        for (const [k, v] of params) if (k.startsWith('utm_') && v) utms[k] = v;
        if (!utms.utm_source && document.referrer) {
          const ref = new URL(document.referrer);
          if (ref.origin !== location.origin) utms.utm_source = ref.hostname.replace(/^www\./, '');
        }
      } catch (_) { /* ignore */ }
      return utms;
    };
    window.dypCurrentUtms = current;
    window.dypStoreUtms = () => {
      try {
        const prev = JSON.parse(localStorage.getItem('utms') || '{}');
        localStorage.setItem('utms', JSON.stringify({ ...prev, ...current() }));
      } catch (_) { /* storage unavailable */ }
    };
    if (window.dypConsent && window.dypConsent.mkt) window.dypStoreUtms();
  })();

  /* ------------------------------------------------------------ lead form
     Same contract as the previous site: POST /api/lead with
     { data: { contact_method, messenger, phone_or_handle | email, message, user_info } } */
  (() => {
    if (window.__leadformBound) return;
    window.__leadformBound = true;

    const getUTMs = () => { // stored ones (marketing consent) or, without consent, those of this page
      let stored = {};
      try { stored = JSON.parse(localStorage.getItem('utms') || '{}'); } catch { stored = {}; }
      return Object.keys(stored).length ? stored : (window.dypCurrentUtms ? window.dypCurrentUtms() : {});
    };
    const deviceInfo = () => ({ ua: navigator.userAgent, platform: navigator?.userAgentData?.platform || '' });
    const buildUserInfo = (locale) => {
      const utm = getUTMs();
      return {
        from_locale: locale,
        from_page: location.href,
        referrer: document.referrer || '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language || '',
        device: deviceInfo(),
        utm_source: utm.utm_source || '',
        utm_medium: utm.utm_medium || '',
        utm_campaign: utm.utm_campaign || '',
        utm_term: utm.utm_term || '',
        utm_content: utm.utm_content || '',
      };
    };

    // tabs
    document.addEventListener('click', (e) => {
      const tab = e.target instanceof Element ? e.target.closest('.lf-tab') : null;
      if (!tab) return;
      const root = tab.closest('[data-lf]');
      if (!root) return;
      const formM = root.querySelector('.lf-form-m');
      const formE = root.querySelector('.lf-form-e');
      const tabM = root.querySelector('.lf-tab-m');
      const tabE = root.querySelector('.lf-tab-e');
      if (!formM || !formE || !tabM || !tabE) return;
      e.preventDefault();
      const isM = tab.classList.contains('lf-tab-m');
      formM.hidden = !isM;
      formE.hidden = isM;
      tabM.classList.toggle('is-active', isM);
      tabE.classList.toggle('is-active', !isM);
      tabM.setAttribute('aria-selected', String(isM));
      tabE.setAttribute('aria-selected', String(!isM));
    });

    // radio -> hidden "messenger"
    document.addEventListener('change', (e) => {
      const el = e.target;
      if (!(el instanceof HTMLInputElement) || el.type !== 'radio') return;
      const root = el.closest('[data-lf]');
      if (!root) return;
      const uid = root.getAttribute('data-uid') || 'lf';
      if (el.name !== `messenger-${uid}` || !el.checked) return;
      const hidden = root.querySelector('input[name="messenger"]');
      if (hidden) hidden.value = el.value;
    }, true);

    // submit
    document.addEventListener('submit', async (e) => {
      const form = e.target;
      if (!(form instanceof HTMLFormElement) || !form.classList.contains('lf-form')) return;
      const root = form.closest('[data-lf]');
      if (!root) return;
      e.preventDefault();
      const action = root.getAttribute('data-action') ?? '';
      const locale = root.getAttribute('data-locale') || LOCALE;
      const lfTitle = root.querySelector('.lf-title');
      const tabs = root.querySelector('.lf-tabs');
      const formM = root.querySelector('.lf-form-m');
      const formE = root.querySelector('.lf-form-e');
      const success = root.querySelector('.lf-success');
      const errorBox = root.querySelector('.lf-error');
      if (!action || !tabs || !formM || !formE || !success) return;
      if (!form.checkValidity()) { form.reportValidity(); return; }
      const btn = form.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      if (errorBox) errorBox.hidden = true;
      const fields = Object.fromEntries(Array.from(new FormData(form)).filter(([k]) => !k.startsWith('messenger-')));
      const user_info = buildUserInfo(locale);
      try {
        const res = await fetch(`/api/${action}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: { ...fields, user_info } }),
        });
        if (!res.ok) throw new Error('Request failed');
        if (lfTitle) lfTitle.hidden = true;
        tabs.hidden = true;
        formM.hidden = true;
        formE.hidden = true;
        success.hidden = false;
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: action.toUpperCase() });
      } catch (err) {
        console.error(err);
        if (btn) btn.disabled = false;
        if (errorBox) errorBox.hidden = false;
      }
    }, true);
  })();

  /* ------------------------------------------------------- copy to clipboard */
  document.addEventListener('click', async (e) => {
    const el = e.target instanceof Element ? e.target.closest('[data-copy],[data-copy-target]') : null;
    if (!el) return;
    const sel = el.getAttribute('data-copy-target');
    const v = el.getAttribute('data-copy') ||
      (sel && ((t) => (t ? (t.value ?? t.textContent ?? '').trim() : ''))(document.querySelector(sel)));
    if (!v) return;
    if (el.hasAttribute('data-copy-only')) e.preventDefault();
    try {
      await navigator.clipboard.writeText(v);
      const prev = el.textContent;
      el.textContent = el.getAttribute('data-copy-ok') || 'Copied';
      setTimeout(() => { el.textContent = prev; }, 900);
    } catch {
      window.prompt('Copy to clipboard (Ctrl/Cmd+C):', v);
    }
  });

  /* ------------------------------------------------------------ accordion */
  $$('.qa__btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') === 'true';
      const panel = document.getElementById(btn.getAttribute('aria-controls'));
      btn.setAttribute('aria-expanded', String(!open));
      panel?.classList.toggle('is-open', !open);
    });
  });

  /* ------------------------------------------------------ smooth anchors */
  document.addEventListener('click', (e) => {
    const a = e.target instanceof Element ? e.target.closest('a[href^="#"]') : null;
    if (!a || a.hasAttribute('data-modal-link')) return;
    const id = a.getAttribute('href').slice(1);
    const target = id && document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    const y = target.getBoundingClientRect().top + window.scrollY - 90;
    if (hasGsap && window.ScrollToPlugin && !reduceMotion) window.gsap.to(window, { duration: .9, scrollTo: y, ease: 'power3.inOut' });
    else window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  /* -------------------------------------------------------------- reveals */
  const revealEls = $$('.reveal, .reveal-right');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach((el) => io.observe(el));
    // safety net: never leave content hidden
    setTimeout(() => revealEls.forEach((el) => el.classList.add('is-in')), 6000);
  } else {
    revealEls.forEach((el) => el.classList.add('is-in'));
  }
  // stagger indexes
  $$('[data-stagger]').forEach((wrap) => {
    Array.from(wrap.children).forEach((c, i) => c.style.setProperty('--i', String(i)));
  });

  /* -------------------------------------------------------- progress rings */
  const rings = $$('[data-ring]');
  const setRing = (el) => {
    const pct = Math.max(0, Math.min(100, Number(el.getAttribute('data-ring')) || 0));
    const len = 125.66;
    el.style.strokeDashoffset = String(len * (1 - pct / 100));
  };
  if ('IntersectionObserver' in window) {
    const io2 = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { setRing(en.target); io2.unobserve(en.target); } });
    }, { threshold: 0.3 });
    rings.forEach((r) => io2.observe(r));
  } else rings.forEach(setRing);

  /* -------------------------------------------------------------- counters */
  const fmt = (n) => { try { return Math.round(n).toLocaleString(LOCALE); } catch { return String(Math.round(n)); } };
  const counters = $$('[data-counter]');
  const runCounter = (el) => {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    const target = Number(el.getAttribute('data-counter')) || 0;
    const prefix = el.getAttribute('data-prefix') || '';
    const suffix = el.getAttribute('data-suffix') || '';
    const raw = el.hasAttribute('data-raw');
    const render = (v) => { el.textContent = prefix + (raw ? String(Math.round(v)) : fmt(v)) + suffix; };
    if (reduceMotion || !hasGsap) { render(target); return; }
    const obj = { v: 0 };
    window.gsap.to(obj, { v: target, duration: 1.8, ease: 'power3.out', onUpdate: () => render(obj.v) });
  };
  if ('IntersectionObserver' in window) {
    const io3 = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { runCounter(en.target); io3.unobserve(en.target); } });
    }, { threshold: 0.4 });
    counters.forEach((c) => io3.observe(c));
  } else counters.forEach(runCounter);

  /* ------------------------------------------------------------- steps */
  $$('[data-steps]').forEach((wrap) => {
    const steps = $$('[data-step]', wrap);
    const num = $('[data-step-num]', wrap);
    const bar = $('[data-step-bar]', wrap);
    const docLines = $$('[data-step-line]', wrap);
    if (!steps.length) return;
    const activate = (i) => {
      steps.forEach((s, j) => s.classList.toggle('is-active', j === i));
      if (num) num.textContent = String(i + 1);
      if (bar) bar.style.width = ((i + 1) / steps.length * 100) + '%';
      docLines.forEach((l, j) => l.classList.toggle('is-on', j <= i));
    };
    activate(0);
    const update = () => {
      const line = window.innerHeight * 0.5;
      let idx = 0;
      steps.forEach((s, j) => { if (s.getBoundingClientRect().top <= line) idx = j; });
      activate(idx);
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
    steps.forEach((s, i) => s.addEventListener('mouseenter', () => activate(i)));
  });

  /* ------------------------------------------ services: tabbed feature cards */
  $$('[data-ftabs]').forEach((bar) => {
    const tabs = $$('.ftabs__tab', bar);
    const wrap = bar.closest('.sec') || document;
    const cards = $$('[data-fcard]', wrap);
    const box = bar.closest('[data-fbox]');
    if (box && cards[0]) box.style.setProperty('--fc-active', getComputedStyle(cards[0]).getPropertyValue('--fc-bg').trim());
    let cur = 0;
    let busy = false;
    /* overlay cards on the photo: pop in one after another, bars fill, numbers count up, then a gentle float */
    const playScene = (card) => {
      const sc = card && $('[data-scene]', card);
      if (!sc || !hasGsap || reduceMotion) return;
      const g = window.gsap;
      const items = $$('.sc', sc);
      const bars = $$('[data-bar]', sc);
      const counts = $$('[data-count]', sc);
      // the cut-out person (.fcard__fg) stays static: it is part of the photo, only the cards animate
      if (card.__sceneTl) card.__sceneTl.kill();
      g.killTweensOf(items.concat(bars));
      g.set(items, { opacity: 0, y: 22, scale: .9 });
      g.set(bars, { scaleX: 0 });
      counts.forEach((el) => { el.textContent = '0'; });
      const tl = g.timeline({ delay: .25 });
      tl.to(items, { opacity: 1, y: 0, scale: 1, duration: .7, stagger: .18, ease: 'back.out(1.4)' }, 0);
      bars.forEach((b) => tl.to(b, { scaleX: 1, duration: 1.3, ease: 'power3.inOut' }, .5));
      counts.forEach((el) => {
        const o = { v: 0 };
        const to = +el.dataset.count || 0;
        tl.to(o, { v: to, duration: 1.3, ease: 'power3.out', onUpdate: () => { el.textContent = String(Math.round(o.v)); } }, .5);
      });
      tl.add(() => { g.to(items, { y: (k) => (k % 2 ? 4 : -4), duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: { each: .4 } }); }, '>-.1');
      card.__sceneTl = tl;
    };
    const stopScene = (card) => {
      if (!card || !hasGsap) return;
      if (card.__sceneTl) { card.__sceneTl.kill(); card.__sceneTl = null; }
      window.gsap.killTweensOf($$('.sc', card));
    };
    // on a phone the strip scrolls: the active tab slides to the left edge and the next one comes in from the right
    const scrollToTab = (i) => {
      const t = tabs[i];
      if (!t || bar.scrollWidth <= bar.clientWidth + 2) return;
      const left = t.getBoundingClientRect().left - bar.getBoundingClientRect().left + bar.scrollLeft - 26;
      bar.scrollTo({ left: Math.max(0, left), behavior: reduceMotion ? 'auto' : 'smooth' });
    };
    const show = (i) => {
      if (i === cur || !cards[i] || busy) return;
      const prev = cards[cur];
      const next = cards[i];
      cur = i;
      tabs.forEach((t, k) => { t.classList.toggle('is-on', k === i); t.setAttribute('aria-selected', String(k === i)); });
      scrollToTab(i);
      if (box) box.style.setProperty('--fc-active', getComputedStyle(next).getPropertyValue('--fc-bg').trim());
      const swap = () => { prev.hidden = true; prev.classList.remove('is-on'); next.hidden = false; next.classList.add('is-on'); };
      if (hasGsap && !reduceMotion) {
        busy = true;
        setTimeout(() => { busy = false; }, 1200); // safety net if a tween is interrupted
        const g = window.gsap;
        g.to(prev, { opacity: 0, y: 14, duration: .22, ease: 'power1.in', onComplete: () => {
          swap();
          stopScene(prev);
          playScene(next);
          g.set(prev, { clearProps: 'opacity,transform' });
          g.fromTo(next, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: .55, ease: 'power3.out', clearProps: 'opacity,transform', onComplete: () => { busy = false; } });
          g.fromTo($$('.fcard__copy > *', next), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .5, stagger: .06, ease: 'power3.out', clearProps: 'opacity,transform', delay: .08 });
          g.fromTo($('.fcard__media', next), { opacity: 0, scale: .96 }, { opacity: 1, scale: 1, duration: .6, ease: 'power3.out', clearProps: 'opacity,transform', delay: .05 });
        } });
      } else swap();
    };
    /* autoplay: next service every 5 s; pauses on hover / focus, when the tab is hidden or the block is off-screen */
    const AUTO = 7000;
    let timer = null;
    let inView = true;
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    const start = () => { if (!timer && inView && !document.hidden && !reduceMotion) timer = setInterval(() => show((cur + 1) % cards.length), AUTO); };
    const restart = () => { stop(); start(); };
    const sec = bar.closest('.sec') || bar;
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    let played = false;
    const firstPlay = () => { if (!played) { played = true; playScene(cards[cur]); } };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((en) => { inView = en[0].isIntersecting; if (inView) { start(); firstPlay(); } else stop(); }, { threshold: .05 }).observe(sec);
    } else { start(); firstPlay(); }
    bar.__auto = { start, stop, setInView: (v) => { inView = v; }, play: () => playScene(cards[cur]) }; // debug hook (visual tests)
    tabs.forEach((t, i) => t.addEventListener('click', () => { show(i); restart(); }));
    // a finger on the strip pauses the autoplay; it resumes a few seconds after the swipe
    let touchT = null;
    bar.addEventListener('touchstart', () => { stop(); clearTimeout(touchT); }, { passive: true });
    bar.addEventListener('touchend', () => { clearTimeout(touchT); touchT = setTimeout(start, 4000); }, { passive: true });
    bar.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const n = (cur + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[n].focus();
      show(n);
      restart();
    });
  });

  /* ------------------------------------------ "how we work": folder + dots + flying cards */
  (() => {
    const sec = $('[data-process]');
    if (!sec) return;
    const finePointer = window.matchMedia('(pointer: fine)').matches;

    /* title: scale to the full width of the section */
    const title = $('[data-fit-title]', sec);
    const fitTitle = () => {
      if (!title) return;
      title.style.fontSize = '';
      const base = parseFloat(getComputedStyle(title).fontSize);
      const avail = sec.clientWidth * 0.94;
      const w = title.scrollWidth;
      if (w > 0) title.style.fontSize = Math.max(18, Math.min(170, base * avail / w)) + 'px';
    };
    fitTitle();
    window.addEventListener('resize', fitTitle);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTitle);

    /* interactive dot grid with cursor glow + ripples */
    const canvas = $('[data-dots]', sec);
    if (canvas && canvas.getContext) {
      const ctx = canvas.getContext('2d');
      const GAP = 26, RAD = 190;
      let mx = -1e4, my = -1e4, run = false, raf = 0, w = 0, h = 0;
      const ripples = [];
      let lastRip = 0, lrx = 0, lry = 0;
      const size = () => {
        const r = sec.getBoundingClientRect();
        const d = Math.min(window.devicePixelRatio || 1, 2);
        w = r.width; h = r.height;
        canvas.width = Math.round(w * d); canvas.height = Math.round(h * d);
        canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
        ctx.setTransform(d, 0, 0, d, 0, 0);
        draw();
      };
      const draw = () => {
        ctx.clearRect(0, 0, w, h);
        const now = performance.now();
        for (let i = ripples.length - 1; i >= 0; i--) if (now - ripples[i].t > 1500) ripples.splice(i, 1);
        const base = () => 'rgba(48,57,84,.16)';
        for (let y = GAP * .5; y < h; y += GAP) {
          for (let x = GAP * .5; x < w; x += GAP) {
            const dx = x - mx, dy = y - my, d2 = dx * dx + dy * dy;
            let r = 1.3, a = 0, hot = 0;
            if (d2 < RAD * RAD) {
              let t = 1 - Math.sqrt(d2) / RAD; t = t * t * (3 - 2 * t);
              r += 3.2 * t; hot = t; a = .16 + .5 * t;
            }
            for (let k = 0; k < ripples.length; k++) {
              const rp = ripples[k];
              const age = (now - rp.t) / 1500;             // 0..1
              const ring = age * 340;                      // ring radius in px
              const dist = Math.sqrt((x - rp.x) ** 2 + (y - rp.y) ** 2);
              const band = Math.abs(dist - ring);
              if (band < 46) {
                const wgt = (1 - band / 46) * (1 - age);
                r += 2.6 * wgt; hot = Math.max(hot, wgt); a = Math.max(a, .16 + .45 * wgt);
              }
            }
            ctx.fillStyle = hot > 0 ? 'rgba(64,157,246,' + a.toFixed(3) + ')' : base();
            ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
          }
        }
      };
      const tick = () => { draw(); raf = (run && (ripples.length || mx > -1e3)) ? requestAnimationFrame(tick) : 0; };
      const kick = () => { if (run && !raf) raf = requestAnimationFrame(tick); };
      if (finePointer && !reduceMotion) {
        sec.addEventListener('pointermove', (e) => {
          const r = canvas.getBoundingClientRect();
          mx = e.clientX - r.left; my = e.clientY - r.top;
          const now = performance.now();
          if (now - lastRip > 90 && Math.hypot(mx - lrx, my - lry) > 28 && ripples.length < 10) {
            ripples.push({ x: mx, y: my, t: now }); lastRip = now; lrx = mx; lry = my;
          }
          kick();
        }, { passive: true });
        sec.addEventListener('pointerleave', () => { mx = my = -1e4; kick(); });
      }
      window.addEventListener('resize', size);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver((en) => { run = en[0].isIntersecting; if (run) kick(); }).observe(sec);
      } else run = true;
      size();
    }

    /* doodles & badges: float and get pushed away by the cursor */
    const folder = $('[data-folder]', sec);
    const fls = $$('[data-fl]', sec);
    if (folder && fls.length && finePointer && !reduceMotion) {
      let mx = -1e4, my = -1e4, run = false, raf = 0;
      const t0 = Date.now();
      const st = fls.map((el, i) => ({ el, x: 0, y: 0, ph: i * 1.7, sp: .0009 + ((i * 37) % 10) * .00012 }));
      window.addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
      const R = 150, PUSH = 30;
      const tick = () => {
        const t = Date.now() - t0;
        for (const o of st) {
          const r = o.el.getBoundingClientRect();
          const cx = r.left + r.width / 2 - o.x, cy = r.top + r.height / 2 - o.y;
          const dx = cx - mx, dy = cy - my, d = Math.sqrt(dx * dx + dy * dy);
          let tx = 0, ty = 0;
          if (d < R && d > .001) { let f = 1 - d / R; f = f * f * (3 - 2 * f); tx = dx / d * PUSH * f; ty = dy / d * PUSH * f; }
          ty += Math.sin(t * o.sp + o.ph) * 3.2; tx += Math.cos(t * o.sp * .8 + o.ph) * 1.6;
          o.x += (tx - o.x) * .1; o.y += (ty - o.y) * .1;
          o.el.style.transform = 'translate3d(' + o.x.toFixed(2) + 'px,' + o.y.toFixed(2) + 'px,0)';
        }
        raf = run ? requestAnimationFrame(tick) : 0;
      };
      if ('IntersectionObserver' in window) {
        new IntersectionObserver((en) => { run = en[0].isIntersecting; if (run && !raf) raf = requestAnimationFrame(tick); }).observe(sec);
      } else { run = true; raf = requestAnimationFrame(tick); }
    }

    /* cards fly out of the folder automatically: when the block reaches the top of the
       viewport the page stops scrolling, the folder opens and the five steps fly out one by
       one; afterwards scrolling is released. Plays once per page view. */
    const row = $('[data-fly]', sec);
    const cards = $$('[data-fly-card]', sec);
    const fimg = $('[data-folder-img]', sec);
    if (!row || !cards.length || !fimg || !hasST || reduceMotion) return;
    const g = window.gsap;
    const n = cards.length;
    const mobile = window.innerWidth <= 940 || !window.matchMedia('(pointer: fine)').matches;
    let cardTl = [];
    let openTl = null;
    let played = false;
    let playing = false;

    const measure = (card) => {
      const fo = fimg.getBoundingClientRect(), co = card.getBoundingClientRect();
      return { dx: (fo.left + fo.width * .5) - (co.left + co.width * .5), dy: (fo.top + fo.height * .16) - (co.top + co.height * .5) };
    };
    const build = () => {
      if (playing) return;
      cardTl.forEach((t) => t.kill());
      if (openTl) openTl.kill();
      g.set(cards, { clearProps: 'transform,opacity' });
      g.set(fimg, { clearProps: 'transform' });
      const pos = cards.map(measure);
      openTl = g.timeline({ paused: true })
        .to(fls, { opacity: 1, duration: .6, stagger: .06, ease: 'power1.out' }, 0)
        .to(fimg, { scale: .86, transformOrigin: '50% 62%', duration: .8, ease: 'power2.inOut' }, .1);
      cardTl = cards.map((card, i) => {
        const p = pos[i];
        return g.timeline({ paused: true })
          .fromTo(card, { x: p.dx, y: p.dy, scale: .45, opacity: 0, rotation: i % 2 ? 7 : -7 },
            { y: p.dy - 190, opacity: 1, scale: .82, duration: .55, ease: 'power2.out' })
          .to(card, { x: 0, y: 0, scale: 1, rotation: 0, duration: .9, ease: 'power2.inOut' });
      });
      g.set(fls, { opacity: played ? 1 : 0 });
      if (played) { openTl.progress(1); cardTl.forEach((t) => t.progress(1)); }
    };
    const GAP = .75;
    const sequence = (onDone) => {
      playing = true;
      openTl.play();
      cards.forEach((c, i) => g.delayedCall(.6 + i * GAP, () => cardTl[i].play()));
      g.delayedCall(.6 + (n - 1) * GAP + 1.55, () => { playing = false; played = true; onDone && onDone(); });
    };

    // page opened already below the block (deep link): show the final state
    if (window.scrollY > sec.getBoundingClientRect().top + window.scrollY - 40) played = true;
    build();
    if (mobile) {
      if ('IntersectionObserver' in window) {
        new IntersectionObserver((en) => { if (en[0].isIntersecting && !played && !playing) sequence(); }, { threshold: .45 }).observe(folder || sec);
      }
    } else {
      window.ScrollTrigger.create({
        trigger: sec, start: 'top 25%', end: 'bottom top',
        onEnter: () => { if (played || playing) return; sequence(); },
        onRefresh: build,
      });
    }
    window.addEventListener('resize', () => { if (!playing) build(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { try { window.ScrollTrigger.refresh(); } catch (e) { /* noop */ } });
  })();

  /* ------------------------------------------- huge section titles: fit to width */
  (() => {
    const titles = $$('.sec__title--big[data-fit-title]');
    if (!titles.length) return;
    const fit = () => titles.forEach((t) => {
      t.style.fontSize = '';
      const base = parseFloat(getComputedStyle(t).fontSize);
      const avail = (t.parentElement ? t.parentElement.clientWidth : window.innerWidth) * 0.98;
      const w = t.scrollWidth;
      if (w > 0 && avail > 0) t.style.fontSize = Math.max(16, Math.min(160, base * avail / w)) + 'px'; // low floor: long words (lt) must never overflow a phone screen
    });
    fit();
    window.addEventListener('resize', fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  })();

  /* services page: the plus-grid background fades out behind the heading + intro (owner) - the fade edge follows the
     real height of that block (it differs per language and screen), passed to CSS as --stop-fade */
  (() => {
    const stop = $('.stop');
    const head = stop && $('.bhead', stop);
    if (!stop || !head) return;
    const set = () => stop.style.setProperty('--stop-fade', head.offsetHeight + 'px');
    set();
    window.addEventListener('resize', set);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(set);
  })();

  /* services bento: the price pills of one row sit at the same level (reviewer, 15.09.2026) - every title box of a row
     takes the height of the tallest title in that row, whatever the language wraps to; the big card has its own anatomy
     and is left alone; on phones every card is its own row, so nothing changes there */
  (() => {
    const grids = $$('.bento');
    if (!grids.length) return;
    const fit = () => grids.forEach((grid) => {
      const cards = $$('.bcard:not(.bcard--big)', grid);
      const titles = cards.map((c) => $('.bcard__t', c));
      titles.forEach((t) => { if (t) t.style.minHeight = ''; });
      const rows = new Map();
      cards.forEach((c, i) => {
        if (!titles[i]) return;
        const k = Math.round(c.getBoundingClientRect().top);
        if (!rows.has(k)) rows.set(k, []);
        rows.get(k).push(titles[i]);
      });
      rows.forEach((ts) => { const h = Math.max(...ts.map((t) => t.offsetHeight)); ts.forEach((t) => { t.style.minHeight = h + 'px'; }); });
    });
    fit();
    window.addEventListener('resize', fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  })();

  /* ------------------------------ one-line hints on narrow screens: shrink the font until the text fits (min 9.5 px) */
  (() => {
    const els = $$('[data-fit-line]');
    if (!els.length) return;
    const mq = window.matchMedia('(max-width: 1000px)');
    const fit = () => els.forEach((el) => {
      el.style.fontSize = '';
      if (!mq.matches) return;
      const spans = $$(':scope > span', el);
      const ic = el.querySelector('.ic');
      const avail = el.clientWidth - (ic ? ic.getBoundingClientRect().width + 8 : 0);
      const base = parseFloat(getComputedStyle(el).fontSize);
      const w = spans.length ? Math.max(...spans.map((sp) => sp.scrollWidth)) : el.scrollWidth; // the widest line
      if (w > avail && avail > 0) el.style.fontSize = Math.max(9.5, base * avail / w - .1) + 'px';
    });
    fit();
    window.addEventListener('resize', fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  })();

  /* ---------------------------------------------- 404: the owl follows the cursor, texts in the visitor's language */
  (() => {
    const sec = $('[data-nf]');
    if (!sec) return;
    // the file is one for every language: pick the texts of the missing URL's language (/uk/..., /pl/...)
    try {
      const langs = JSON.parse(($('[data-nf-langs]', sec) || {}).textContent || '{}');
      const seg = (location.pathname.split('/').filter(Boolean)[0] || '').toLowerCase();
      const L = langs[seg];
      if (L && seg !== 'en') {
        $$('[data-nf-t]', sec).forEach((el) => { const v = L[el.getAttribute('data-nf-t')]; if (v) el.textContent = v; });
        const home = $('[data-nf-home]', sec);
        if (home) home.setAttribute('href', (L.prefix || '') + '/');
        document.documentElement.lang = seg;
      }
    } catch (e) { /* keep English */ }
    const owl = $('[data-owl]', sec);
    if (!owl) return;
    const pupils = $$('[data-pupil]', owl);
    const head = $('[data-owl-head]', owl);
    const cap = $('[data-owl-cap]', owl);
    const svgUnit = () => 320 / (owl.getBoundingClientRect().width || 320); // px -> svg units
    let raf = 0, px = null, py = null, lastMove = 0;
    const look = (x, y) => {
      const u = svgUnit();
      pupils.forEach((p) => {
        const r = p.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1;
        const k = Math.min(1, d / 260) * 9; // up to 9 svg units of travel
        p.style.transform = 'translate(' + (dx / d * k).toFixed(2) + 'px,' + (dy / d * k).toFixed(2) + 'px)';
      });
      if (head) {
        const hr = head.getBoundingClientRect();
        const t = Math.max(-1, Math.min(1, (x - (hr.left + hr.width / 2)) / 420));
        const v = Math.max(-1, Math.min(1, (y - (hr.top + hr.height / 2)) / 420));
        head.style.transform = 'rotate(' + (t * 7).toFixed(2) + 'deg) translateY(' + (v * 4 * u).toFixed(2) + 'px)';
        if (cap && !owl.matches(':hover')) cap.style.transform = 'rotate(' + (-t * 5).toFixed(2) + 'deg)';
      }
    };
    const onMove = (e) => {
      px = e.clientX; py = e.clientY; lastMove = performance.now();
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; look(px, py); });
    };
    if (!reduceMotion) {
      window.addEventListener('pointermove', onMove, { passive: true });
      // no pointer for a while (touch devices, idle): the owl looks around by itself
      setInterval(() => {
        if (performance.now() - lastMove < 2500) return;
        const r = owl.getBoundingClientRect();
        look(r.left + r.width * (Math.random() * 1.6 - .3), r.top + r.height * (Math.random() * 1.2 - .2));
      }, 2600);
    }
    // a tap: a little hop
    owl.addEventListener('click', () => { owl.classList.remove('is-hop'); void owl.offsetWidth; owl.classList.add('is-hop'); });
    owl.addEventListener('animationend', (e) => { if (e.animationName === 'owl-hop') owl.classList.remove('is-hop'); });
  })();

  /* ---------------------------------------------- hero: cursor halo over the grid */
  $$('[data-halo]').forEach((sec) => {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    sec.addEventListener('pointermove', (e) => {
      const r = sec.getBoundingClientRect();
      sec.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      sec.style.setProperty('--my', (e.clientY - r.top) + 'px');
      sec.classList.add('is-hover');
    });
    sec.addEventListener('pointerleave', () => sec.classList.remove('is-hover'));
  });

  /* ------------------------------------------ home hero: rotating word + order dashboard */
  (() => {
    const wrap = $('[data-dash]');
    const dataEl = wrap && wrap.querySelector('[data-hero-data]');
    if (!wrap || !dataEl) return;
    let D;
    try { D = JSON.parse(dataEl.textContent); } catch { return; }
    const word = $('[data-rot-word]');
    const rot = word && word.parentElement;
    const N = (D.rot || []).length;
    const START = D.start || 0;

    /* keep "Ваша {word}" on one line: shrink the tagline so the longest word still fits */
    const tag = $('.hero__tagline');
    const l1 = tag && tag.querySelector('.tag__l1');
    const fitTag = () => {
      if (!tag || !l1 || !word || !rot) return;
      tag.style.fontSize = '';
      const base = parseFloat(getComputedStyle(tag).fontSize);
      const avail = tag.clientWidth;
      const cur = word.textContent;
      const savedW = rot.style.width;
      rot.style.width = 'auto';
      let max = 0;
      (D.rot || []).forEach((w) => { word.textContent = w; max = Math.max(max, l1.scrollWidth); });
      word.textContent = cur;
      rot.style.width = savedW;
      if (max > avail && avail > 0) tag.style.fontSize = Math.floor(base * avail / max * 100) / 100 + 'px';
    };
    fitTag();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTag);
    let tagRaf = 0;
    window.addEventListener('resize', () => { cancelAnimationFrame(tagRaf); tagRaf = requestAnimationFrame(fitTag); });
    /* the whole dashboard levitates a little (owner, 16.09.2026); paused while the hero is off-screen */
    if (!reduceMotion) {
      wrap.classList.add('is-float');
      if ('IntersectionObserver' in window) new IntersectionObserver((en) => wrap.classList.toggle('is-away', !en[0].isIntersecting), { threshold: 0 }).observe(wrap);
    }
    if (!hasGsap || reduceMotion || N < 2) return;

    const g = window.gsap;
    const PERIOD = 6400;
    let cur = START;      // index of the work type shown now
    let master = null;
    let timer = null;
    let visible = !document.hidden;
    let inView = true;

    const swapWord = (next) => {
      if (!word || !rot) return;
      const w0 = rot.offsetWidth;
      g.to(word, { yPercent: -110, opacity: 0, duration: .32, ease: 'power2.in', onComplete: () => {
        word.textContent = next;
        g.set(rot, { width: 'auto' });
        const w1 = rot.offsetWidth;
        g.set(rot, { width: w0 });
        g.to(rot, { width: w1, duration: .5, ease: 'power3.out', onComplete: () => g.set(rot, { width: 'auto' }) });
        g.fromTo(word, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .55, ease: 'power3.out' });
      } });
    };

    /* the floating chips: how each kind leaves and arrives (the round one flies out from behind the shoulder) */
    const CHIP_EASE = {};
    const chipsBox = $('.hchips', wrap);
    // the set mirrors for every second work type; sideways moves mirror with it (the round chip always comes out from
    // behind the figure towards its own side)
    const chipMoves = (out) => {
      const m = chipsBox && chipsBox.classList.contains('is-alt') ? -1 : 1;
      // small travel, no overshoot: the chips should drift rather than jump (owner: "плавніше й непомітніше")
      return out
        ? { term: { x: -14 * m }, price: { y: -10 }, inc: { y: 12 }, uniq: { scale: .92, x: -16 * m }, msg: { y: 10 } }
        : { term: { x: -24 * m }, price: { y: -22 }, inc: { y: 22 }, uniq: { scale: .86, x: -30 * m }, msg: { y: 18 } };
    };
    if (chipsBox) chipsBox.classList.toggle('is-alt', START % 2 === 1);
    const el = {
      name: $('[data-dash-name]', wrap), step: $('[data-dash-step]', wrap), bar: $('[data-dash-bar]', wrap),
      arc: $('[data-dash-arc]', wrap), pct: $('[data-dash-pct]', wrap), stage: $('[data-dash-stage]', wrap),
      uniq: $('[data-dash-uniq]', wrap), file: $('[data-dash-file]', wrap), msg: $('[data-dash-msg]', wrap), ava: $('[data-dash-ava]', wrap),
      pill: $('.dash__pill', wrap), fileCard: $('.dash__file', wrap), msgCard: $('.dash__msg', wrap),
    };
    const state = { pct: 0, uniq: 0 };
    const hello = $('.dash__card--hello', wrap);
    const playScene = (idx) => {
      cur = idx;
      if (master) master.kill();
      const tl = g.timeline();
      master = tl;
      const n = D.n;
      swapWord(D.rot[idx] || D.rot[0]);
      const ti = n.step[idx] || 1;
      const renderPct = () => {
        if (el.pct) el.pct.textContent = String(Math.round(state.pct));
        if (el.arc) el.arc.setAttribute('stroke-dashoffset', String(100 - state.pct));
        if (el.bar) el.bar.style.width = state.pct + '%';
      };
      /* the order card flies out to the left and a new one flies in from the right */
      if (hello) {
        tl.to(hello, { x: -90, rotation: -5, autoAlpha: 0, duration: .45, ease: 'power2.in' }, .05);
        tl.add(() => {
          if (el.name) el.name.textContent = D.names[idx] || '';
          if (el.step) el.step.textContent = D.step + ' ' + ti + ' · ' + (D.titles[ti - 1] || '');
          if (el.stage) el.stage.textContent = D.stage[idx] || '';
          state.pct = 0; renderPct();
        }, .5);
        tl.fromTo(hello, { x: 110, rotation: 5, autoAlpha: 0 }, { x: 0, rotation: 0, autoAlpha: 1, duration: .75, ease: 'back.out(1.3)', immediateRender: false }, .55);
      }
      tl.to(state, { pct: n.prog[idx], duration: 1.6, ease: 'power2.out', onUpdate: renderPct }, 1.05);
      tl.to(state, { uniq: n.uniq[idx], duration: 1.2, ease: 'power2.out', onUpdate: () => { if (el.uniq) el.uniq.textContent = String(Math.round(state.uniq)); } }, .5);
      if (el.pill) tl.fromTo(el.pill, { scale: 1 }, { scale: 1.05, duration: .25, yoyo: true, repeat: 1, ease: 'power2.inOut', immediateRender: false }, 1.5);
      if (el.file) {
        tl.to(el.fileCard, { x: 18, autoAlpha: 0, duration: .3, ease: 'power2.in' }, .6);
        tl.add(() => { el.file.textContent = (D.names[idx] || '').replace(/\s+/g, '_') + '_v4.docx'; }, .9);
        tl.fromTo(el.fileCard, { x: -18, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: .55, ease: 'power3.out', immediateRender: false }, .95);
      }
      /* photo variant: the person for the new word replaces the current one (old one sinks, new one rises) */
      const people = $$('.hphoto__person', wrap);
      if (people.length) {
        const next = people.find((p) => Number(p.getAttribute('data-person')) === idx) || people[0];
        const now = people.find((p) => p.classList.contains('is-on'));
        if (now && now !== next) {
          tl.to(now, { y: 26, autoAlpha: 0, duration: .7, ease: 'sine.inOut', onComplete: () => { now.classList.remove('is-on'); g.set(now, { clearProps: 'all' }); } }, .05);
          tl.add(() => { people.forEach((p) => { if (p !== next && p !== now) p.classList.remove('is-on'); }); next.classList.add('is-on'); }, .55);
          tl.fromTo(next, { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.1, ease: 'power2.out', immediateRender: false }, .55);
        }
      }
      const chips = $$('.hchip', wrap);
      if (chips.length && D.chips) {
        chips.forEach((ch, k) => {
          const kind = ch.getAttribute('data-hchip');
          tl.to(ch, { ...chipMoves(true)[kind], autoAlpha: 0, duration: .55, ease: 'sine.inOut' }, .05 + k * .06);
          if (k === 0) tl.add(() => { if (chipsBox) chipsBox.classList.toggle('is-alt', idx % 2 === 1); }, .9);  // all chips are hidden by .84
          tl.add(() => {
            const facts = D.chips[idx] || {};
            const v = ch.querySelector('[data-hchip-val]');
            const val = facts[kind] || '';
            if (v) v.textContent = val;
            const sub = ch.querySelector('[data-hchip-sub]');
            if (sub) sub.textContent = facts.pages || '';
            const list = ch.querySelector('[data-hchip-list]');
            if (list && Array.isArray(facts.inc)) {
              const lis = list.querySelectorAll('li');
              facts.inc.forEach((t, n) => { const li = lis[n]; if (li) { const sp = li.querySelector('span'); if (sp) sp.textContent = t; li.hidden = false; } });
              for (let n = facts.inc.length; n < lis.length; n++) lis[n].hidden = true;
            }
            const ring = kind === 'uniq' && ch.querySelector('circle:last-of-type');
            if (ring) ring.setAttribute('stroke-dasharray', (parseFloat(val) || 0) + ' 100');
            const av = ch.querySelector('[data-dash-ava]');
            if (av && D.photos && D.photos.length) av.src = D.photos[idx % D.photos.length];
          }, .92);
          tl.add(() => { g.set(ch, { ...chipMoves(false)[kind], autoAlpha: 0 }); }, .94);
          tl.to(ch, { x: 0, y: 0, scale: 1, rotation: 0, autoAlpha: 1, duration: 1.2, ease: CHIP_EASE[kind] || 'power2.out' }, 1.4 + k * .1);
        });
      }
      if (el.msgCard) {
        tl.to(el.msgCard, { y: 16, autoAlpha: 0, duration: .3, ease: 'power2.in' }, 1.1);
        tl.add(() => { if (el.msg) el.msg.textContent = '«' + (D.msgs[idx] || '') + '»'; if (el.ava && D.photos && D.photos.length) el.ava.src = D.photos[idx % D.photos.length]; }, 1.4);
        tl.fromTo(el.msgCard, { y: 26, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .65, ease: 'back.out(1.4)', immediateRender: false }, 1.45);
      }
    };
    wrap.__playScene = playScene; // debug hook

    const tick = () => {
      timer = null;
      if (!visible || !inView) return;
      playScene((cur + 1) % N);
      timer = setTimeout(tick, PERIOD);
    };
    const start = () => { if (!timer && visible && inView) timer = setTimeout(tick, PERIOD); };
    const stop = () => { if (timer) { clearTimeout(timer); timer = null; } };
    document.addEventListener('visibilitychange', () => { visible = !document.hidden; visible ? start() : stop(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((en) => { inView = en[0].isIntersecting; inView ? start() : stop(); }, { threshold: .15 }).observe(wrap);
    } else start();

    /* intro: copy slides up, the dashboard flies in, cards pop one by one, then the first scene's numbers count up */
    const cards = $$('[data-dash-card]', wrap);
    const win = $('.dash__win', wrap);
    const backs = $$('.dash__back', wrap);
    const panels = $$('.hphoto__panel', wrap);
    const person = $('.hphoto__person.is-on', wrap) || $('.hphoto__person', wrap);
    const intro = g.timeline({ delay: .1 });
    intro.from('.hero__eyebrow, .hero__tagline .tag__part, .hero__tagline .rot', { y: 30, opacity: 0, duration: .8, stagger: .08, ease: 'power3.out' }, 0)
      .from('.hero__h1, .hero--home .hero__lead, .hcalc, .hero__proof, .hero__stats, .hero--home .chips', { y: 22, opacity: 0, duration: .7, stagger: .08, ease: 'power3.out' }, .2);
    if (backs.length) intro.from(backs, { x: 60, opacity: 0, rotate: 0, duration: 1, stagger: .1, ease: 'power3.out' }, .15);
    if (win) intro.from(win, { x: 90, opacity: 0, rotationY: -14, transformPerspective: 1400, duration: 1.1, ease: 'power3.out', clearProps: 'rotationY,transformPerspective' }, .25);
    // photo variant: the panels slide in, the person rises onto them
    if (panels.length) intro.from(panels, { x: 60, opacity: 0, duration: 1, stagger: .1, ease: 'power3.out' }, .15);
    if (person) intro.from(person, { y: 60, opacity: 0, duration: 1.1, ease: 'power3.out' }, .3);
    $$('.hchip', wrap).forEach((ch, k) => {
      const kind = ch.getAttribute('data-hchip');
      intro.fromTo(ch, { ...chipMoves(false)[kind], autoAlpha: 0 }, { x: 0, y: 0, scale: 1, rotation: 0, autoAlpha: 1, duration: 1.2, ease: CHIP_EASE[kind] || 'power2.out' }, 1.4 + k * .1);
    });
    if (cards.length) intro.from(cards, { y: 26, opacity: 0, scale: .96, duration: .7, stagger: .14, ease: 'back.out(1.5)' }, .7);
    intro.add(() => { const first = g.timeline(); master = first; state.pct = 0; state.uniq = 0;
        first.to(state, { pct: D.n.prog[cur], duration: 1.6, ease: 'power2.out', onUpdate: () => { if (el.pct) el.pct.textContent = String(Math.round(state.pct)); if (el.arc) el.arc.setAttribute('stroke-dashoffset', String(100 - state.pct)); if (el.bar) el.bar.style.width = state.pct + '%'; } }, 0);
        first.to(state, { uniq: D.n.uniq[cur], duration: 1.2, ease: 'power2.out', onUpdate: () => { if (el.uniq) el.uniq.textContent = String(Math.round(state.uniq)); } }, .2);
      }, 1.1);
    /* idle life: cards and panels breathe, sparkles drift */
    // the dashboard cards no longer 'breathe' after the intro (reviewer, 16.09.2026: less perpetual motion)
    // the panels behind the frosted window stay still after the intro: anything moving behind a backdrop-filter makes the
    // browser re-blur the whole window every frame (15.09.2026 - the owner's machine lagged on the home page)
    $$('.spark', wrap).forEach((s, k) => g.to(s, { y: k % 2 ? -9 : 9, rotate: k % 2 ? 25 : -25, scale: 1.15, duration: 2.2 + k * .4, ease: 'sine.inOut', yoyo: true, repeat: -1 }));
  })();

  /* ------------------------------------------ about (text version): the stats column drifts down while the page scrolls */
  (() => {
    const side = $('.about-t__side');
    const copy = $('.about-t__copy');
    const hasST = typeof window.ScrollTrigger !== 'undefined';
    if (!side || !copy || !hasGsap || !hasST || reduceMotion) return;
    // owner (16.09.2026): the text stays put, the tiles slide DOWN while the page scrolls and fill the empty space
    // under them - they end flush with the bottom of the text column (at least a small drift when the columns are level)
    const drop = () => Math.max(copy.offsetHeight - side.offsetHeight, 40);
    window.gsap.matchMedia().add('(min-width: 901px)', () => {
      window.gsap.fromTo(side, { y: 0 }, { y: drop, ease: 'none', scrollTrigger: { trigger: side.closest('.sec') || side, start: 'top 80%', end: 'bottom 20%', scrub: .6, invalidateOnRefresh: true } });
    });
  })();

  /* ------------------------------------------ about (text version): faint academic icons drift on two layers */
  (() => {
    const bg = $('[data-about-bg]');
    if (!bg || reduceMotion) return;
    const sec = bg.closest('.sec') || bg;
    const far = bg.querySelector('[data-layer="far"]');
    const near = bg.querySelector('[data-layer="near"]');
    if (hasGsap && typeof window.ScrollTrigger !== 'undefined' && far && near) {
      // parallax: the far layer lags the page a little, the near layer leads it - two speeds read as depth
      window.gsap.matchMedia().add('(min-width: 901px)', () => {
        const st = () => ({ trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true });
        window.gsap.fromTo(far, { y: 36 }, { y: -36, ease: 'none', scrollTrigger: st() });
        window.gsap.fromTo(near, { y: -70 }, { y: 70, ease: 'none', scrollTrigger: st() });
      });
    }
    // near the pointer the icons lean away and show a touch more (pointer: fine only; reads first, then writes)
    if (!window.matchMedia('(pointer: fine)').matches) return;
    const icons = $$('.about-t__ico', bg);
    const R = 240;
    let raf = 0, px = 0, py = 0, active = false;
    const paint = () => {
      raf = 0;
      const rects = icons.map((el) => el.getBoundingClientRect());
      icons.forEach((el, i) => {
        const r = rects[i];
        const dx = r.left + r.width / 2 - px, dy = r.top + r.height / 2 - py;
        const d = Math.hypot(dx, dy);
        if (!active || d > R) {
          if (el.__hot) { el.__hot = false; el.style.removeProperty('--dx'); el.style.removeProperty('--dy'); el.style.removeProperty('--tilt'); el.style.removeProperty('opacity'); }
          return;
        }
        const t = 1 - d / R;
        el.__hot = true;
        el.style.setProperty('--dx', (dx / (d || 1)) * t * 14 + 'px');
        el.style.setProperty('--dy', (dy / (d || 1)) * t * 14 + 'px');
        el.style.setProperty('--tilt', (dx < 0 ? -1 : 1) * t * 12 + 'deg');
        el.style.opacity = String((el.classList.contains('about-t__ico--near') ? .1 : .07) + t * .12);
      });
    };
    sec.addEventListener('pointermove', (e) => { px = e.clientX; py = e.clientY; active = true; if (!raf) raf = requestAnimationFrame(paint); });
    sec.addEventListener('pointerleave', () => { active = false; if (!raf) raf = requestAnimationFrame(paint); });
  })();

  /* ------------------------------------------ phones: "show more" folds (management, 28.09.2026) */
  $$('[data-mfold]').forEach((box) => {
    const btn = box.querySelector('.mfold__btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const open = box.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? (btn.getAttribute('data-less') || '') : (btn.getAttribute('data-more') || '');
    });
  });

  /* ------------------------------------------ working hours: 10:00-22:00 Warsaw, shown in the visitor's own time zone */
  (() => {
    const els = $$('[data-hours]');
    const tg = $('[data-tg-status][data-hours-chat]');
    if (!els.length && !tg) return;
    const OPEN = 10, CLOSE = 22, TZ = 'Europe/Warsaw';
    const lang = (document.documentElement.lang || 'en').slice(0, 2);
    const LOCALE = { uk: 'uk-UA', ru: 'ru-RU', en: 'en-GB', pl: 'pl-PL', cs: 'cs-CZ', de: 'de-DE', it: 'it-IT', sk: 'sk-SK', lt: 'lt-LT', fr: 'fr-FR' }[lang] || lang;
    let localTz = '';
    try { localTz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { /* old browsers: local time only */ }
    const parse = (s) => new Date(s).getTime();
    const offsetMin = (tz, d) => { try { return (parse(d.toLocaleString('en-US', { timeZone: tz })) - parse(d.toLocaleString('en-US', { timeZone: 'UTC' }))) / 60000; } catch (e) { return -d.getTimezoneOffset(); } };
    const fmt = (d) => { try { return d.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit', hour12: false, numberingSystem: 'latn', timeZone: localTz || undefined }); } catch (e) { return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); } };
    const parseJson = (el, name) => { try { return JSON.parse(el.getAttribute(name) || '{}'); } catch (e) { return {}; } };
    const update = () => {
      const now = new Date();
      const wOff = offsetMin(TZ, now);
      const lOff = localTz ? offsetMin(localTz, now) : -now.getTimezoneOffset();
      let w;
      try { w = new Date(now.toLocaleString('en-US', { timeZone: TZ })); } catch (e) { w = now; }
      const at = (h, dayShift) => new Date(Date.UTC(w.getFullYear(), w.getMonth(), w.getDate() + (dayShift || 0), h, 0) - wOff * 60000); // the instant of h:00 in Warsaw
      const open = at(OPEN), close = at(CLOSE);
      const isOn = now >= open && now < close;
      const nextOpen = now < open ? open : at(OPEN, 1);
      const same = Math.abs(wOff - lOff) < 1;
      els.forEach((el) => {
        const S = parseJson(el, 'data-hours');
        const text = el.querySelector('[data-hours-text]');
        const nowEl = el.querySelector('[data-hours-now]');
        if (text) text.textContent = same ? (S.warsaw || '') : (S.local || '').replace('{from}', fmt(open)).replace('{to}', fmt(close)) + ' (' + (S.warsaw || '') + ')';
        if (nowEl) nowEl.textContent = '· ' + (isOn ? (S.on || '') : (S.off || '').replace('{from}', fmt(nextOpen)));
        el.classList.toggle('is-off', !isOn);
      });
      if (tg) {
        const S = parseJson(tg, 'data-hours-chat');
        const was = tg.getAttribute('data-online');
        const txt = isOn ? (S.on || was) : (S.off || was).replace('{from}', fmt(nextOpen));
        tg.setAttribute('data-online', txt);
        if (tg.textContent === was) tg.textContent = txt;
        tg.classList.toggle('is-off', !isOn);
      }
    };
    update();
    setInterval(update, 60000);
  })();

  /* ------------------------------------------ calculator: the summary of the current estimate travels in the request */
  $$('[data-calc]').forEach((root) => {
    const out = $('[data-calc-summary]', root);
    if (!out) return;
    const selText = (sel) => { const e = $(sel, root); if (!e) return ''; return e.tagName === 'SELECT' ? ((e.selectedOptions[0] && e.selectedOptions[0].textContent) || '').trim() : e.textContent.trim(); };
    const sync = () => {
      const parts = [];
      const active = $('[data-calc-type].is-active', root);
      parts.push(selText('[data-calc-type-select]') || (active ? active.textContent.trim() : ''));
      parts.push(selText('[data-calc-country]'), selText('[data-calc-lang]'), selText('[data-calc-pages-val]'), selText('[data-calc-days-val]'));
      const adds = $$('[data-calc-addon]', root).filter((a) => a.checked).map((a) => { const lab = a.closest('label'); const t = lab && lab.querySelector('.calc__addon-t'); return t ? t.textContent.trim() : ''; }).filter(Boolean);
      if (adds.length) parts.push('+ ' + adds.join(', '));
      const total = selText('[data-calc-total]');
      if (total) parts.push('≈ ' + total);
      out.value = parts.filter(Boolean).join(' · ');
    };
    root.addEventListener('input', sync);
    root.addEventListener('change', sync);
    root.addEventListener('click', () => setTimeout(sync, 0));
    sync();
    setTimeout(sync, 400);
  });

  /* ------------------------------------------ contact icons: a click copies the handle / address (owner, 29.09.2026) */
  const cicoClose = (except) => {
    $$('.cico__item.is-open').forEach((el) => { if (el !== except) el.classList.remove('is-open'); });
  };
  document.addEventListener('click', async (e) => {
    const btn = e.target instanceof Element ? e.target.closest('[data-cico]') : null;
    if (!btn) { if (!(e.target instanceof Element && e.target.closest('.cico__item'))) cicoClose(null); return; }
    const item = btn.closest('.cico__item');
    const out = item && item.querySelector('[data-cico-val]');
    const val = btn.getAttribute('data-value') || '';
    if (!val) return;
    /* the tooltip stays open after a tap (touch screens have no hover) until a tap elsewhere, Escape or the mouse leaves */
    cicoClose(item);
    if (item) item.classList.add('is-open');
    const done = () => {
      if (!out || !item) return;
      const prev = out.textContent;
      out.textContent = btn.getAttribute('data-copied') || 'Copied';
      item.classList.add('is-copied');
      setTimeout(() => { out.textContent = prev; item.classList.remove('is-copied'); }, 1400);
    };
    try { await navigator.clipboard.writeText(val); done(); } catch (err) {
      const ta = document.createElement('textarea');
      ta.value = val; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { if (document.execCommand('copy')) done(); } catch (e2) { /* nothing to do */ }
      ta.remove();
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cicoClose(null); });
  document.addEventListener('pointerleave', (e) => {
    const item = e.target instanceof Element ? e.target.closest('.cico__item') : null;
    if (item && e.pointerType === 'mouse') item.classList.remove('is-open');
  }, true);

  /* ------------------------------------------ orders around the world: dotted globe */
  (() => {
    const root = $('[data-globe]');
    const canvas = root && root.querySelector('canvas');
    const raw = window.__GLOBE;
    if (!root || !canvas || !Array.isArray(raw) || raw.length < 4) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const D = Math.PI / 180;
    const n = raw.length >> 1;
    const px = new Float32Array(n); const py = new Float32Array(n); const pz = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const la = raw[2 * i] * D; const lo = raw[2 * i + 1] * D; const cl = Math.cos(la);
      px[i] = cl * Math.sin(lo); py[i] = Math.sin(la); pz[i] = cl * Math.cos(lo);
    }
    const DOT_K = Math.sqrt(11500 / (window.__GLOBE_N || 11500)); // a denser grid gets smaller dots: the globe keeps its look
    const HOME = { lat: 44, lon: 32 };
    const view = { lat: HOME.lat, lon: HOME.lon };
    const pins = $$('[data-pin]', root);
    const cards = $$('[data-card]', root);
    const links = root.querySelector('[data-links]'); const lctx = links && links.getContext('2d'); const PAD = 80; // the canvas of the lines
    const wrap = root.closest('[data-globe-wrap]') || root;
    const sec = root.closest('.sec') || document;
    const AUTO = reduceMotion ? 0 : 4; // degrees per second (was ~2.7; owner, 30.09.2026: a little faster)
    /* one label per point: the plaque, its anchor (offset from the point on a 620-px globe) and the side it lies on.
       The order of the markup is the priority when plaques collide. */
    const labels = cards.map((el, i) => ({
      el, i, pin: pins[i], pinIn: pins[i] && pins[i].firstElementChild,
      lat: parseFloat(el.dataset.lat), lon: parseFloat(el.dataset.lon),
      ax: parseFloat(el.dataset.ax) || 0, ay: parseFloat(el.dataset.ay) || 0, side: el.dataset.side || 'r',
      w: 0, h: 0, a: 0, vis: 0, x: 0, y: 0, hid: 0, flipped: false, cand: 0, tgt: 0,
      lx1: 0, ly1: 0, lx2: 0, ly2: 0, pt: '', po: '', pz: '', pe: '', ct: '', co: '', ce: '',
    }));
    let W = 0; let R = 0; let dpr = 1; let K = 1; let GS = 1; let minX = 0; let maxX = 0;
    const measure = () => { labels.forEach((l) => { l.w = l.el.offsetWidth; l.h = l.el.offsetHeight; }); };
    const size = () => {
      W = root.clientWidth || 1; dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(W * dpr);
      if (links) { links.width = Math.round((W + 2 * PAD) * dpr); links.height = Math.round((W + 2 * PAD) * dpr); }
      R = Math.max(1, W / 2 - 4); // never negative (a hidden/zero-width block would break the radial gradient)
      K = W / 620; // the whole composition scales with the globe: phones show the same picture, only smaller
      GS = Math.max(.8, Math.min(1, K)); root.style.setProperty('--gs', String(GS));
      const sw = wrap.clientWidth || W; minX = -(sw - W) / 2; maxX = W + (sw - W) / 2; // plaques fade before the stage cuts them
      measure();
    };
    const rot = () => ({ cL: Math.cos(view.lon * D), sL: Math.sin(view.lon * D), cT: Math.cos(view.lat * D), sT: Math.sin(view.lat * D) });
    const proj = (lat, lon, r) => {
      const la = lat * D; const lo = lon * D; const cl = Math.cos(la);
      const x = cl * Math.sin(lo); const y = Math.sin(la); const z = cl * Math.cos(lo);
      const x1 = x * r.cL - z * r.sL; const z1 = x * r.sL + z * r.cL;
      const y2 = y * r.cT - z1 * r.sT; const z2 = y * r.sT + z1 * r.cT;
      return { x: W / 2 + R * x1, y: W / 2 - R * y2, z: z2 };
    };
    let boostSet = []; let boostAt = 0; let now = 0; // plaques that go first for a while: the ones hidden the longest, or the tapped point
    /* a DOM write only when the value changed (writes with the same value are skipped) */
    const put = (l, key, el, prop, v) => { if (l[key] !== v) { l[key] = v; el.style[prop] = v; } };
    let lastLat = NaN; let lastLon = NaN; let lastW = 0; let settled = false; let focusKey = null;
    const draw = (dt = 1 / 60, force = false) => {
      const focused = labels.find((l) => l.el === document.activeElement) || null;
      if (!force && settled && view.lat === lastLat && view.lon === lastLon && W === lastW && now <= boostAt && focused === focusKey) return; // nothing moves: no redraw
      lastLat = view.lat; lastLon = view.lon; lastW = W; focusKey = focused;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, W);
      const c = W / 2;
      const grd = ctx.createRadialGradient(c - R * .38, c - R * .42, R * .08, c, c, R);
      grd.addColorStop(0, '#FFFFFF'); grd.addColorStop(.55, '#EAF1FA'); grd.addColorStop(1, '#C9DAEE');
      ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(c, c, R, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(48,57,84,.10)'; ctx.stroke();
      const r = rot();
      const r0 = Math.max(1.1, R / 108 * DOT_K);
      /* one fill per dot: Chrome draws single circles on a fast path (measured 01.10.2026: 60 fps with the doubled dots,
         while one path of hundreds of arcs per depth group fell to ~29 fps) */
      ctx.fillStyle = '#303954';
      for (let i = 0; i < n; i++) {
        const x1 = px[i] * r.cL - pz[i] * r.sL; const z1 = px[i] * r.sL + pz[i] * r.cL;
        const y2 = py[i] * r.cT - z1 * r.sT; const z2 = py[i] * r.sT + z1 * r.cT;
        if (z2 <= .03) continue;
        ctx.globalAlpha = .16 + .74 * z2;
        ctx.beginPath(); ctx.arc(c + R * x1, c - R * y2, r0 * (.5 + .5 * z2), 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1;
      /* markers, plaques and the lines between them. Plaques are placed by priority; one that would overlap a placed
         plaque or cover a marker fades out (its marker stays). Every couple of seconds the visible markers whose plaques
         have been hidden the longest go first, so on a phone the plaques take turns; a tap on a marker shows its plaque
         at once, and a plaque with keyboard focus is always shown. A plaque never leaves the stage: a side one flips to
         the other side of its marker. Positions are written as transforms (no layout per frame). */
      const small = W < 480;
      const KA = small ? Math.max(K, .72) : K; // a phone keeps the plaques readable (>= 11 px), so their ring is a little wider than the globe's scale
      const HEAD = 24.5 * GS; const PW = 12 * GS; const PH = 37 * GS; // marker: head centre above the tip, half-width, height
      const kA = 1 - Math.pow(1 - .18, Math.min(4, dt * 60)); // the same fade speed at 60 and 120 Hz
      labels.forEach((l) => {
        const q = proj(l.lat, l.lon, r);
        l.x = q.x; l.y = q.y; l.vis = Math.max(0, Math.min(1, (q.z - .08) * 5));
        if (l.pin && (l.vis > 0 || l.po !== '0')) {
          put(l, 'pt', l.pin, 'transform', 'translate(' + q.x.toFixed(1) + 'px,' + q.y.toFixed(1) + 'px)');
          put(l, 'po', l.pin, 'opacity', l.vis.toFixed(2));
          put(l, 'pz', l.pin, 'zIndex', String(10 + Math.max(0, Math.round(900 - q.y)))); // the NORTHERN marker in front: a drop only rises
          // above its own tip, so no tip is ever covered (01.10.2026: south-in-front hid the CIS tip on the Russia-Belarus border
          // under Ukraine's head 27 px below it, and Poland's under Slovakia's); stays below the plaques (z 1000)
          if (l.pinIn) put(l, 'pe', l.pinIn, 'pointerEvents', l.vis > .5 ? '' : 'none'); // a marker on the back takes no taps
        }
      });
      if (now > boostAt) {
        boostAt = now + (small ? 1800 : 2600);
        boostSet = labels.filter((l) => l.vis > .6 && l.a < .5).sort((p, q) => p.hid - q.hid).slice(0, small ? 3 : 1).map((l) => l.i);
        boostSet.forEach((i) => { labels[i].hid = now; }); // its turn is used even if it cannot be placed: no starving the others
      } // empty when nothing is hidden: the order of the markup applies
      const first = (focused ? [focused] : []).concat(boostSet.map((i) => labels[i]).filter((l) => l !== focused));
      const order = first.concat(labels.filter((l) => first.indexOf(l) < 0));
      const placed = [];
      let still = true;
      order.forEach((l) => {
        let ax = l.x + l.ax * KA; const ay = l.y + l.ay * KA;
        let left = l.side === 'r' ? ax : l.side === 'l' ? ax - l.w : ax - l.w / 2;
        const top0 = l.side === 't' ? ay - l.h : l.side === 'b' ? ay : ay - l.h / 2;
        let flipped = false;
        if (l.side === 'r' && left + l.w > maxX - 2) { ax = l.x - l.ax * KA; left = ax - l.w; flipped = true; }
        else if (l.side === 'l' && left < minX + 2 && l.x - l.ax * KA + l.w < maxX - 2 && !small) { ax = l.x - l.ax * KA; left = ax; flipped = true; }
        left = Math.max(minX + 2, Math.min(maxX - l.w - 2, left));
        if (flipped !== l.flipped) { l.flipped = flipped; l.a = 0; } // appears at the new place instead of jumping
        /* the preferred spot, else one plaque-height above or below it (same side, so the lines do not cross); the spot
           in use is kept while it stays free, so a plaque does not hop between spots */
        const m = l.a > .5 ? 1 : 5; // a shown plaque keeps its place more easily than a hidden one takes it
        const free = (t) => t > -8 && t + l.h < W + 8 // not over the text above the globe nor the hint below it
          && !placed.some((b) => left < b.r + m && left + l.w > b.l - m && t < b.b + m && t + l.h > b.t - m)
          && (small || !labels.some((o) => o.vis > .3 && o.x + PW > left - 3 && o.x - PW < left + l.w + 3 && o.y > t - 3 && o.y - PH < t + l.h + 3)); // never hide a marker (desktop)
        const tops = [top0, top0 - l.h - 6, top0 + l.h + 6];
        let k = free(tops[l.cand]) ? l.cand : tops.findIndex(free);
        let hit = k < 0;
        if (hit) k = l.cand;
        else if (k !== l.cand) { l.cand = k; l.a = Math.min(l.a, .15); } // moved: fades in at the new spot
        if (l === focused && l.vis > .3) hit = false; // keyboard focus: always visible
        const top = tops[k];
        const target = hit ? 0 : l.vis;
        l.tgt = target;
        if (target > .05) placed.push({ l: left, t: top, r: left + l.w, b: top + l.h });
        const was = l.a;
        l.a += (target - l.a) * kA;
        if (Math.abs(target - l.a) < .004) l.a = target;
        if (l.a !== target) still = false;
        if (was >= .5 && l.a < .5) l.hid = now;
        if (l.a > 0 || l.co !== '0.000') {
          put(l, 'ct', l.el, 'transform', 'translate(' + left.toFixed(1) + 'px,' + top.toFixed(1) + 'px)');
          put(l, 'co', l.el, 'opacity', l.a.toFixed(3));
          put(l, 'ce', l.el, 'pointerEvents', l.a > .5 ? 'auto' : 'none');
        }
        const hy = l.y - HEAD; // the line: from the head of the marker to the nearest spot of the plaque (it starts under the marker)
        l.lx1 = l.x; l.ly1 = hy; l.lx2 = Math.max(left, Math.min(left + l.w, l.x)); l.ly2 = Math.max(top, Math.min(top + l.h, hy));
      });
      settled = still;
      if (lctx) {
        lctx.setTransform(dpr, 0, 0, dpr, dpr * PAD, dpr * PAD);
        lctx.clearRect(-PAD, -PAD, W + 2 * PAD, W + 2 * PAD);
        lctx.lineWidth = 1.1; lctx.strokeStyle = 'rgb(48,57,84)';
        labels.forEach((l) => {
          if (l.a < .01) return;
          lctx.globalAlpha = .45 * l.a;
          lctx.beginPath(); lctx.moveTo(l.lx1, l.ly1); lctx.lineTo(l.lx2, l.ly2); lctx.stroke();
        });
        lctx.globalAlpha = 1;
      }
    };

    /* drag to rotate (inertia), auto-rotation when idle, click a card to bring it to the front */
    let dragging = false; let lx = 0; let ly = 0; let lt = 0; let vel = 0; let moved = 0; let downCard = null; let downPin = null; let pid = null; // vel: degrees per 1/60 s; pid: the one pointer that drags
    let idleAt = 0; let intro = false; let running = false; let raf = 0;
    const goTo = (lat, lon) => {
      idleAt = performance.now() + 6000; vel = 0;
      const dl = ((((lon - view.lon + 180) % 360) + 360) % 360) - 180; // the short way round, whatever view.lon has grown to
      const tLat = Math.max(-40, Math.min(60, lat - 6));
      if (hasGsap && !reduceMotion) {
        const t = { lat: view.lat, lon: view.lon };
        window.gsap.to(t, { lat: tLat, lon: view.lon + dl, duration: 1.1, ease: 'power3.inOut', onUpdate: () => { view.lat = t.lat; view.lon = t.lon; } });
      } else { view.lat = tLat; view.lon += dl; }
    };
    root.addEventListener('pointerdown', (e) => {
      if (e.button || dragging) return; // a second finger (pinch) does not take over the drag
      pid = e.pointerId;
      dragging = true; moved = 0; lx = e.clientX; ly = e.clientY; lt = e.timeStamp; vel = 0;
      downCard = e.target instanceof Element ? e.target.closest('[data-card]') : null;
      downPin = e.target instanceof Element ? e.target.closest('[data-pin]') : null;
      root.classList.add('is-drag');
      try { root.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    });
    root.addEventListener('pointermove', (e) => {
      if (!dragging || e.pointerId !== pid) return;
      const dx = e.clientX - lx; const dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
      const dtE = Math.max(1 / 240, Math.min(.1, (e.timeStamp - lt) / 1000)); lt = e.timeStamp;
      moved += Math.abs(dx) + Math.abs(dy);
      view.lon -= dx * .35; view.lat = Math.max(-60, Math.min(78, view.lat + dy * .3)); vel = -dx * .35 / (dtE * 60); // the same fling on any screen
      idleAt = performance.now() + 4000;
    });
    const up = (e) => {
      if (!dragging || (e && e.pointerId !== pid)) return;
      dragging = false; root.classList.remove('is-drag');
      if (e && e.timeStamp - lt > 80) vel = 0; // held still before release: no fling
      const card = downCard; const pin = downPin; downCard = null; downPin = null;
      if (e && e.type === 'pointercancel') { vel = 0; idleAt = performance.now() + 4000; return; } // the browser took the touch (page scroll): not a tap
      if (card && moved < 6) { goTo(parseFloat(card.dataset.lat), parseFloat(card.dataset.lon)); return; } // goTo holds the globe for 6 s
      if (pin && moved < 6) { // a tap on a marker: its plaque goes first for five seconds, the globe holds still
        const idx = pins.indexOf(pin);
        if (idx >= 0) { boostSet = [idx]; boostAt = now + 5000; idleAt = performance.now() + 5000; vel = 0; return; }
      }
      idleAt = performance.now() + 4000;
    };
    root.addEventListener('pointerup', up); root.addEventListener('pointercancel', up);
    cards.forEach((card) => card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goTo(parseFloat(card.dataset.lat), parseFloat(card.dataset.lon)); } }));
    // keyboard focus on a plaque: the globe turns to its country, so the focused plaque (shown first) is in view
    cards.forEach((card) => card.addEventListener('focus', () => { if (!dragging) goTo(parseFloat(card.dataset.lat), parseFloat(card.dataset.lon)); }));
    let last = 0;
    const loop = (t) => {
      const dt = last ? Math.min(.05, (t - last) / 1000) : 0; last = t; now = t;
      if (!dragging && !intro) {
        if (Math.abs(vel) > .02) { view.lon += vel * dt * 60; vel *= Math.pow(.93, dt * 60); } else if (t > idleAt) view.lon += AUTO * dt; // the same speed on any display
        if (view.lon > 540 || view.lon < -540) view.lon = ((view.lon % 360) + 540) % 360 - 180; // bounded; the picture is the same
      }
      draw(dt || 1 / 60);
      raf = requestAnimationFrame(loop);
    };
    const start = () => { if (!running) { running = true; last = 0; raf = requestAnimationFrame(loop); } };
    const stop = () => { running = false; cancelAnimationFrame(raf); };
    size(); draw(1 / 60, true);
    let rt = 0;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { size(); draw(1 / 60, true); }, 80); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); draw(1 / 60, true); }); // plaque widths change when the web font arrives

    /* appearance: counter, globe rises and spins into place, markers pop up from their tips, plaques fade in */
    const animate = hasGsap && !reduceMotion;
    const pinIns = $$('.gpin__in', root); const cardIns = $$('.gcard__in', root);
    const numEl0 = $('[data-globe-num]', sec);
    if (animate) { window.gsap.set(wrap, { autoAlpha: 0 }); window.gsap.set(pinIns, { scale: 0, transformOrigin: '50% 95%' }); window.gsap.set(cardIns, { autoAlpha: 0 }); if (links) window.gsap.set(links, { autoAlpha: 0 }); if (numEl0) numEl0.textContent = '0'; }
    let appeared = false;
    const appear = () => {
      if (appeared) return;
      appeared = true;
      const numEl = $('[data-globe-num]', sec);
      const lang = document.documentElement.lang || 'en';
      const sep = numEl ? numEl.getAttribute('data-sep') || ',' : ',';
      const fmt = (v) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, sep); // the server's digit grouping ("5 000", "5.000", "5,000")
      if (!animate) return;
      const g = window.gsap;
      intro = true;
      const tl = g.timeline();
      const o = { v: 0 };
      if (numEl) tl.to(o, { v: parseFloat(numEl.dataset.globeNum) || 0, duration: 7.5, ease: 'power1.out', onUpdate: () => { numEl.textContent = fmt(o.v); } }, 0);
      tl.fromTo(wrap, { y: 160, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.4, ease: 'power3.out' }, .1);
      const r = { lon: HOME.lon - 90 }; view.lon = r.lon;
      tl.to(r, { lon: HOME.lon, duration: 2.1, ease: 'power3.out', onUpdate: () => { view.lon = r.lon; }, onComplete: () => { intro = false; vel = 0; idleAt = performance.now() + 1500; } }, .1);
      tl.fromTo(pinIns, { scale: 0 }, { scale: 1, duration: .6, ease: 'back.out(2.4)', stagger: .07 }, 1.3);
      tl.fromTo(cardIns, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: .5, stagger: .07, ease: 'power3.out' }, 1.45);
      if (links) tl.to(links, { autoAlpha: 1, duration: .6, ease: 'power1.out' }, 1.45);
    };
    root.__globe = { view, appear, draw, labels, tick: (ms) => { now += ms; draw(ms / 1000, true); } }; // debug hook (tick = let the plaques' clock run without the frame loop)
    let visible = !document.hidden; let inView = false;
    const sync = () => { if (visible && inView) { start(); appear(); } else stop(); };
    document.addEventListener('visibilitychange', () => { visible = !document.hidden; sync(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((en) => { inView = en[0].isIntersecting; sync(); }, { threshold: .25 }).observe(root);
    } else { inView = true; sync(); }
  })();

  /* ---------------------------------------------------------- price calculator */
  $$('[data-calc]').forEach((root) => {
    let D;
    try { D = JSON.parse($('[data-calc-data]', root).textContent); } catch { return; }
    const P = D.P; const S = D.s;
    const typeBtns = $$('[data-calc-type]', root);
    const selT = $('[data-calc-type-select]', root); // the type is a select on the prices page
    const selC = $('[data-calc-country]', root); const selL = $('[data-calc-lang]', root);
    const rngP = $('[data-calc-pages]', root); const rngD = $('[data-calc-days]', root);
    const pagesVal = $('[data-calc-pages-val]', root); const daysVal = $('[data-calc-days-val]', root);
    const pagesScale = $('[data-calc-pages-scale]', root); const daysScale = $('[data-calc-days-scale]', root);
    const phdNote = $('[data-calc-phd]', root);
    const pagesBox = $('[data-calc-pagesbox]', root); const addonsBox = $('[data-calc-addonsbox]', root);
    const NAME = D.names || {}; // every service of the price list, in the page language
    const addons = $$('[data-calc-addon]', root);
    const totalEl = $('[data-calc-total]', root); const eurEl = $('[data-calc-eur]', root); const rowsEl = $('[data-calc-rows]', root);
    if (!selC || !selL || !rngP || !rngD || !totalEl) return;
    let type = D.defType;
    // signs, rounding steps and sign position of every currency come from content/currencies.json through the page data
    const CUR = D.cur || {};
    const SYM = Object.assign({ PLN: 'zł', UAH: '₴', KZT: '₸', CZK: 'Kč', EUR: '€', GBP: '£', USD: '$' }, CUR.sym || {});
    const STEP = Object.assign({ PLN: 10, UAH: 50, KZT: 500, CZK: 50, EUR: 5, GBP: 5, USD: 5 }, CUR.step || {});
    const PREFIX = Object.assign({ USD: 1, GBP: 1 }, CUR.prefix || {}); // $1,560 rather than 1,560 $
    const GAP = CUR.gap || {}; // a letter sign takes a space: Rp 15.700.000
    const ceil = (v, s) => Math.ceil(v / s - 1e-9) * s;
    // the same digit grouping as the server prints (the separator of the language), always Western digits
    const SEP = D.sep || ',';
    const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, SEP);
    // plural category (0 = one, 1 = few, 2 = many) by the rule of the language - the same table as plural_form() in build.py
    const category = (n) => {
      const a = n % 10; const b = n % 100;
      switch (D.plural || 'one') {
        case 'none': return 0;
        case 'fr': return n <= 1 ? 0 : 2;
        case 'east': return (a === 1 && b !== 11) ? 0 : (a >= 2 && a <= 4 && (b < 12 || b > 14)) ? 1 : 2;
        case 'pl': return n === 1 ? 0 : (a >= 2 && a <= 4 && (b < 12 || b > 14)) ? 1 : 2;
        case 'cs': return n === 1 ? 0 : (n >= 2 && n <= 4) ? 1 : 2;
        case 'lt': return (a === 1 && (b < 11 || b > 19)) ? 0 : (a >= 2 && a <= 9 && (b < 11 || b > 19)) ? 1 : 2;
        case 'lv': return (a === 1 && b !== 11) ? 0 : 2;
        case 'ro': return n === 1 ? 0 : (n === 0 || (b >= 2 && b <= 19)) ? 1 : 2;
        case 'sl': return b === 1 ? 0 : (b >= 2 && b <= 4) ? 1 : 2;
        case 'ar': return n === 1 ? 0 : (n >= 2 && n <= 10) ? 1 : 2;
        default: return n === 1 ? 0 : 2;
      }
    };
    const plural = (n, forms) => {
      if (!forms || !forms.length) return '';
      const c = category(n);
      if (forms.length < 3) return forms[c === 0 ? 0 : 1];
      return forms[c];
    };
    const market = () => P.markets[selC.value] || P.markets.PL;
    // the name of the chosen option: the own country / language of an added language has no entry in the string tables
    const optText = (sel) => { const o = sel.options[sel.selectedIndex]; return o ? o.textContent.trim() : sel.value; };
    const coef = () => Math.max(market().k, (P.markets[P.langs[selL.value]] || market()).k);
    const money = (zl) => { const m = market(); const num = fmt(ceil(zl * m.rate, STEP[m.cur] || 1)); const sym = SYM[m.cur] || m.cur; return PREFIX[m.cur] ? sym + (GAP[m.cur] ? '\u00a0' : '') + num : num + ' ' + sym; };
    const eur = (zl) => '≈ €' + fmt(ceil(zl * P.eur, 5));
    const fill = (r) => { const p = (r.value - r.min) / (r.max - r.min) * 100; r.style.setProperty('--p', p + '%'); };
    const term = (t, n) => n + ' ' + plural(n, t.months ? S.months : S.days);
    const urgency = (days) => { for (const [min, pct] of P.urgency) if (days >= min) return pct; return P.urgency[P.urgency.length - 1][1]; };
    const core = (t, pages) => {
      if (t.model === 'chapters') {
        const n = Math.min(6, Math.max(2, Math.round((pages - 10) / t.cp)));
        return { zl: P.base.intro + n * P.base.chapter + P.base.concl + (t.norm ? P.base.norm : 0) + (t.plus || 0), n };
      }
      if (t.model === 'per') { const n = Math.max(1, Math.round(pages / 20)); return { zl: n * (t.per || P.base.chapter), n }; }
      if (t.model === 'flat') { const extra = t.extra_from ? Math.max(0, pages - t.extra_from) * t.extra_rate : 0; return { zl: t.base + extra, extra }; }
      return { zl: t.base };
    };
    const row = (l, v, total) => '<div class="calc__row' + (total ? ' calc__row--total' : '') + '"><span>' + l + '</span><b>' + v + '</b></div>';
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const fromList = () => {
      const k = coef();
      $$('[data-calc-from]', root.closest('.sec') || document).forEach((el) => {
        const key = el.dataset.calcFrom; const t = P.types[key];
        const zl = t ? core(t, t.pages[2]).zl : P.base[key];
        el.textContent = S.from + ' ' + money(ceil(zl * k, 10));
      });
    };
    const calc = () => {
      const t = P.types[type]; const k = coef(); const pages = t.pages ? +rngP.value : 0; const n = +rngD.value;
      const c = core(t, pages);
      const coreK = ceil(c.zl * k, 10);
      const u = t.months ? 0 : urgency(n);
      const withU = ceil(coreK * (1 + u), 10);
      let add = 0; const addRows = [];
      addons.forEach((a) => {
        const key = a.dataset.calcAddon; const lab = a.closest('label'); const priceEl = lab && lab.querySelector('[data-calc-addon-price]');
        const included = key === 'norm' && !!t.norm; const allowed = (t.addons || []).includes(key); // only where it makes sense
        if (lab) lab.hidden = !allowed;
        a.disabled = included;
        if (included) a.checked = false;
        const pz = ceil((P.base[key] || 0) * k, 10);
        const label = (key === 'it' ? S.from + ' ' : '') + money(pz);
        if (priceEl) priceEl.textContent = included ? S.norm_incl : label;
        if (a.checked && !a.disabled && allowed) { add += pz; addRows.push([S.addon_names[key] || key, label]); }
      });
      const total = withU + add;
      if (pagesVal && t.pages) pagesVal.textContent = pages + ' ' + S.pp;
      const urgTxt = u ? S.urgent.replace('{n}', String(Math.round(u * 100))) : S.no_surcharge;
      if (daysVal) daysVal.innerHTML = esc(term(t, n)) + (u ? ' <i>· ' + esc(urgTxt) + '</i>' : '');
      totalEl.textContent = S.from + ' ' + money(total);
      if (eurEl) eurEl.textContent = market().cur === 'EUR' ? '' : eur(total);
      let rows = row(esc(NAME[type] || S.types[type] || type), esc(S.from + ' ' + money(coreK)));
      if (t.pages) rows += row(esc(S.pages + ': ' + pages + ' ' + S.pp), esc(c.n ? c.n + ' ' + plural(c.n, S.chapters) : c.extra ? '+ ' + money(ceil(c.extra * k, 10)) : S.in_price));
      rows += row(esc(S.deadline + ': ' + term(t, n)), esc(t.months ? S.no_surcharge : urgTxt));
      rows += row(esc(S.country + ' · ' + S.language), esc((S.markets[selC.value] || optText(selC)) + ' · ' + (S.langs[selL.value] || optText(selL))));
      addRows.forEach((r) => { rows += row(esc(r[0]), esc('+ ' + r[1])); });
      rows += row(esc(S.total), esc(S.from + ' ' + money(total)), true);
      if (rowsEl) rowsEl.innerHTML = rows;
      fromList();
    };
    const applyType = () => {
      const t = P.types[type];
      typeBtns.forEach((b) => { const on = b.dataset.calcType === type; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
      if (selT && selT.value !== type) selT.value = type;
      if (pagesBox) pagesBox.hidden = !t.pages;
      if (t.pages) { rngP.min = t.pages[0]; rngP.max = t.pages[1]; rngP.value = t.pages[2]; }
      if (addonsBox) addonsBox.hidden = !(t.addons || []).length;
      const d = t.months || t.days; rngD.min = d[0]; rngD.max = d[1]; rngD.value = d[2];
      if (pagesScale && t.pages) pagesScale.innerHTML = '<span>' + t.pages[0] + '</span><span>' + t.pages[1] + '</span>';
      if (daysScale) daysScale.innerHTML = '<span>' + esc(term(t, d[0])) + '</span><span>' + esc(term(t, d[1])) + '</span>';
      if (phdNote) phdNote.hidden = t.model !== 'from';
      fill(rngP); fill(rngD); calc();
    };
    typeBtns.forEach((b) => b.addEventListener('click', () => { type = b.dataset.calcType; applyType(); }));
    if (selT) selT.addEventListener('change', () => { if (P.types[selT.value]) { type = selT.value; applyType(); } });
    [selC, selL].forEach((s) => s.addEventListener('change', calc));
    [rngP, rngD].forEach((r) => r.addEventListener('input', () => { fill(r); calc(); }));
    addons.forEach((a) => a.addEventListener('change', calc));
    const wanted = (location.hash || '').slice(1); // /prices/#bachelor from a service card
    if (P.types[wanted]) { type = wanted; applyType(); }
    root.__calc = { calc, applyType, setType: (t) => { type = t; applyType(); } }; // debug hook
    try {
      const q = new URLSearchParams(location.search);
      if (q.get('type') && P.types[q.get('type')]) type = q.get('type');
      const topic = (q.get('topic') || '').trim();
      if (topic) $$('textarea[name="message"]').forEach((ta) => { if (!ta.value) ta.value = topic; });
    } catch { /* ignore */ }
    applyType();
  });

  /* -------------------------------------------------------- hero intro */
  if (hasGsap && !reduceMotion) {
    const g = window.gsap;
    const title = $('.hero__title');
    if (title && !title.dataset.split) {
      title.dataset.split = '1';
      const words = title.textContent.trim().split(/\s+/);
      title.innerHTML = words.map((w) => `<span class="w">${w.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span>`).join(' ');
      g.from(title.querySelectorAll('.w'), { yPercent: 60, opacity: 0, rotateX: -30, duration: .9, stagger: .045, ease: 'power3.out', delay: .1 });
    }
    g.from('.hero .stars .ic', { scale: 0, opacity: 0, duration: .5, stagger: .06, ease: 'back.out(2)', delay: .05 });
    g.from('.hero .chip', { y: 18, opacity: 0, scale: .9, duration: .6, stagger: .05, ease: 'back.out(1.6)', delay: .55 });
    // floating decorations: gentle infinite drift
    $$('.float, .doc__float').forEach((el, i) => {
      g.to(el, { y: i % 2 ? -10 : 10, x: i % 3 ? 4 : -4, duration: 2.6 + (i % 3) * .5, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * .2 });
    });
    $$('.doc__paper').forEach((el, i) => {
      g.to(el, { y: i % 2 ? -6 : 6, duration: 3.4, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    });
  }

  /* -------------------------------------------------- scrub effects (GSAP) */
  if (hasST && !reduceMotion) {
    const g = window.gsap;
    // hero card parallax on scroll-out
    const heroCard = $('.hero__card');
    if (heroCard) {
      g.to('.hero__copy', { yPercent: -8, opacity: .6, ease: 'none', scrollTrigger: { trigger: heroCard, start: 'bottom 80%', end: 'bottom 20%', scrub: true } });
    }
    // banner glow drift on scroll
    $$('.banner').forEach((b) => {
      g.fromTo($('.banner__glow', b), { xPercent: -6 }, { xPercent: 6, ease: 'none', scrollTrigger: { trigger: b, start: 'top bottom', end: 'bottom top', scrub: true } });
      g.fromTo($('.orb', b), { rotate: -8, scale: .9 }, { rotate: 8, scale: 1, ease: 'none', scrollTrigger: { trigger: b, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    // big statement titles slide in
    $$('.intro').forEach((el) => {
      g.from($('.intro__mark', el), { scale: .4, opacity: 0, duration: .8, ease: 'back.out(1.7)', scrollTrigger: { trigger: el, start: 'top 75%' } });
    });
  }

  /* ------------------------------------------- specialists: coverflow carousel */
  // every card gets data-o = its offset from the active card (-3..3, circular); CSS turns it into position/scale/fade.
  // Autoplay (5 s) stops for good once the visitor navigates, and has its own pause/play button (WCAG 2.2.2).
  $$('[data-xp]').forEach((root) => {
    const track = $('.xp__track', root);
    let cards = $$('[data-xp-card]', root);
    if (!cards.length) return;
    // with only a handful of specialists the ring would wrap right at the screen edge and a card would pop out of
    // sight; one hidden copy of every card moves the wrap far off-screen (the copies are added by JS, so the page
    // source still has each specialist exactly once)
    if (track && cards.length < 8) {
      cards.forEach((c) => {
        const clone = c.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        clone.dataset.xpClone = '1';
        track.appendChild(clone);
      });
      cards = $$('[data-xp-card]', root);
    }
    const N = cards.length;
    root.classList.add('is-ready');
    const stage = $('.xp__stage', root) || root;
    const live = $('[data-xp-live]', root);
    let cur = 0;
    const offset = (i) => { let o = (((i - cur) % N) + N) % N; if (o > N / 2) o -= N; return Math.max(-3, Math.min(3, o)); };
    const place = (delta) => {
      cards.forEach((c, i) => {
        const o = offset(i);
        const was = c.dataset.o === undefined ? null : Number(c.dataset.o);
        // a card that crosses the ends of the ring (its raw new offset had to be wrapped) must not fly across the stage
        const jump = was === null || delta === 0 || was - delta !== o;
        if (jump) c.classList.add('is-jump');
        c.dataset.o = String(o);
        c.classList.toggle('is-on', o === 0);
        c.setAttribute('aria-current', o === 0 ? 'true' : 'false');
        if (jump) { void c.offsetWidth; c.classList.remove('is-jump'); }
      });
    };
    const go = (i) => {
      const target = ((i % N) + N) % N;
      let d = (((target - cur) % N) + N) % N;
      if (d > N / 2) d -= N;
      cur = target;
      place(d);
    };
    place(0);

    const DELAY = 4000; // owner, 16.09.2026: every auto slider steps every 4 s
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    let auto = !mq.matches && N > 1 && !root.closest('[data-experts-static]'); // the attribute would make the slider manual
    let timer = null;
    let inView = false;
    let focus = false;
    const halt = () => { if (timer) { clearInterval(timer); timer = null; } };
    const run = () => { if (!timer && auto && inView && !focus && !document.hidden) timer = setInterval(() => go(cur + 1), DELAY); };
    const setAuto = (on) => {
      auto = on && N > 1;
      if (auto) run(); else halt();
    };
    setAuto(auto);
    if (mq.addEventListener) mq.addEventListener('change', () => { if (mq.matches) setAuto(false); });

    const real = cards.filter((c) => !c.dataset.xpClone).length || N; // the copies must not show up in "3 / 6"
    const announce = () => {
      if (!live) return;
      const h = $('.xp__name', cards[cur]);
      live.textContent = (h ? h.textContent + ' ' : '') + ((cur % real) + 1) + ' / ' + real;
    };
    const userGo = (i) => { halt(); go(i); announce(); run(); }; // a manual step only restarts the clock: the ring keeps rolling by itself

    const bn = $('[data-xp-next]', root);
    const bp = $('[data-xp-prev]', root);
    if (bn) bn.addEventListener('click', () => userGo(cur + 1));
    if (bp) bp.addEventListener('click', () => userGo(cur - 1));
    let swiped = false;
    cards.forEach((c, i) => c.addEventListener('click', () => {
      if (swiped) { swiped = false; return; }
      if (i !== cur) userGo(i);
    }));
    let sx = null;
    stage.addEventListener('pointerdown', (e) => { sx = e.clientX; swiped = false; stage.classList.add('is-drag'); });
    const endDrag = () => { sx = null; stage.classList.remove('is-drag'); };
    stage.addEventListener('pointerup', (e) => {
      if (sx === null) return;
      const dx = e.clientX - sx;
      endDrag();
      if (Math.abs(dx) > 45) { swiped = true; userGo(dx < 0 ? cur + 1 : cur - 1); }
    });
    stage.addEventListener('pointercancel', endDrag);
    root.addEventListener('keydown', (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      e.stopPropagation(); // keep the reviews Swiper (document-level keyboard handler) out of it
      userGo(e.key === 'ArrowRight' ? cur + 1 : cur - 1);
    });
    // no pause on hover (owner: the slider must run whenever it is on screen); keyboard focus still holds it
    root.addEventListener('focusin', () => { focus = !!root.querySelector(':focus-visible'); if (focus) halt(); });
    root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget)) { focus = false; run(); } });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((en) => { inView = en[0].isIntersecting; if (inView) run(); else halt(); }, { threshold: .05 }).observe(root); // starts as soon as the block shows up
    } else { inView = true; run(); }
    document.addEventListener('visibilitychange', () => (document.hidden ? halt() : run()));
    root.__xp = { go, next: () => go(cur + 1), prev: () => go(cur - 1), get index() { return cur; }, setAuto }; // debug hook
  });

  /* --------------------------------------- FAQ: cards flying on scroll (pinned) */
  // the heading fades in while the section approaches; then the section pins and every card flies along an arc from
  // the bottom right corner, up over the heading, and down into the bottom left corner, while the rings spread out
  $$('[data-fq]').forEach((sec) => {
    const cards = $$('[data-fq-card]', sec);
    const pin = $('.fq__pin', sec);
    const head = $('.fq__head', sec);
    const rings = $('[data-fq-rings]', sec);
    if (!cards.length || !pin || !hasGsap || !window.ScrollTrigger || !window.gsap.matchMedia) return;
    const g = window.gsap;
    // matchMedia keeps the two modes in sync with the viewport and with Reduce Motion, and reverts cleanly
    const slots = $$('.fq__slot', sec);
    // fly mode needs room for the heading and two rows of landed cards - shorter screens get the plain column
    g.matchMedia().add('(min-width: 901px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)', () => {
      sec.classList.add('is-fly');
      cards.forEach((c, i) => { c.style.zIndex = String(10 + i); });
      // the heading arrives before the pin starts, so the first pinned frame is never an empty screen
      const headTl = g.fromTo(head, { opacity: 0, y: 46 }, {
        opacity: 1, y: 0, ease: 'none',
        scrollTrigger: { trigger: sec, start: 'top 85%', end: 'top 35%', scrub: .4 },
      });
      const STEP = .45;                                // how closely one card follows the next
      const FLY = 1.4;                                 // one card's flight, in timeline units
      const span = () => window.innerHeight * .42 * (STEP * cards.length + FLY + .6); // ~1.8 screens of scroll for the whole flight
      // the pin lasts the flight (span) plus one more screen: the finished grid stays put while the next section slides
      // up over it. pinSpacing is off, so the space for the flight comes from the spacer under the pinned screen;
      // during the extra screen the following section overlaps ("нахльост" - owner, 15.09.2026)
      const spacer = $('[data-fq-spacer]', sec);
      const size = () => { if (spacer) spacer.style.height = span() + 'px'; };
      size();
      const tl = g.timeline({
        // a slightly longer scrub lets the cards glide instead of snapping to every wheel tick
        scrollTrigger: { trigger: sec, start: 'top top', end: () => '+=' + (span() + window.innerHeight), pin: pin, pinSpacing: false, scrub: 1.6, invalidateOnRefresh: true, onRefreshInit: size },
      });
      if (rings) tl.fromTo(rings, { scale: 1, opacity: .75 }, { scale: 2.1, opacity: 1, duration: cards.length * STEP + 1.8, ease: 'none' }, 0);
      const farX = () => window.innerWidth * .46;      // off-screen left/right
      const lowY = () => window.innerHeight * .42;     // the two bottom corners
      // where a card lands: the centre of its slot relative to the stage centre (the card's static box)
      const stage = cards[0].parentElement; // the cards' static box is the centre of the stage
      const slotX = (i) => { const r = slots[i].getBoundingClientRect(), s = stage.getBoundingClientRect(); return r.left + r.width / 2 - (s.left + s.width / 2); };
      const slotY = (i) => { const r = slots[i].getBoundingClientRect(), s = stage.getBoundingClientRect(); return r.top + r.height / 2 - (s.top + s.height / 2); };
      cards.forEach((c, i) => {
        const at = .35 + i * STEP;
        // The card arrives from the bottom right corner turned away in 3D and flies STRAIGHT to its slot in the 3 x 2
        // grid (owner: no detour through the centre), straightening and growing on the way, and stays there: after the
        // flight all six questions are on screen, over the heading, and can be read without any more scrolling
        // (reviewer, 15.09.2026: "cool, but is it convenient?"). autoAlpha: a card that has not flown yet is
        // visibility:hidden, so its backdrop costs nothing.
        tl.fromTo(c, { x: farX, y: lowY, autoAlpha: 0 }, { x: () => slotX(i), y: () => slotY(i), duration: FLY, ease: 'power3.out' }, at)
          .fromTo(c, { rotationY: 30, rotationZ: 9 }, { rotationY: 0, rotationZ: 0, duration: FLY, ease: 'power2.out' }, at)
          .fromTo(c, { scale: .84 }, { scale: 1, duration: FLY, ease: 'power2.out' }, at)
          .fromTo(c, { autoAlpha: 0 }, { autoAlpha: 1, duration: .22, ease: 'none' }, at);
      });
      tl.to({}, { duration: .4 }); // a short tail, so a fast scroll can never leave the last card in the air
      // the extra screen of the pin: the timeline holds its final frame while the next section covers the block
      tl.to({}, { duration: tl.duration() * (window.innerHeight / span()) });
      // Ctrl+F, caret browsing and screen magnifiers select text inside a card whose position depends only on the
      // scroll offset, so the browser would scroll to the card's static box and leave the match transparent and
      // off-screen. Snap the page to the moment that card is at the top of its arc instead.
      const onSelect = () => {
        const sel = document.getSelection();
        if (!sel || sel.isCollapsed || !sel.rangeCount) return;
        const node = sel.getRangeAt(0).startContainer;
        const el = node.nodeType === 1 ? node : node.parentElement;
        const card = el && el.closest ? el.closest('[data-fq-card]') : null;
        const i = card && sec.contains(card) ? cards.indexOf(card) : -1;
        if (i < 0 || parseFloat(getComputedStyle(card).opacity) > .15) return; // already on screen: leave it alone
        const st = tl.scrollTrigger;
        window.scrollTo(0, st.start + (st.end - st.start) * ((.35 + i * STEP + FLY) / tl.duration()));
      };
      document.addEventListener('selectionchange', onSelect);
      sec.__fq = { tl, headTl }; // debug hook
      return () => { // back to the plain column when the window narrows or Reduce Motion goes on
        const st = tl.scrollTrigger;
        const inside = st && st.progress > 0 && st.progress < 1; // the reader is in the middle of the flight
        document.removeEventListener('selectionchange', onSelect);
        sec.classList.remove('is-fly');
        g.set([head, ...cards, rings].filter(Boolean), { clearProps: 'all' });
        cards.forEach((c) => { c.style.zIndex = ''; });
        if (spacer) spacer.style.height = '';
        sec.__fq = null;
        // without the pin the page is suddenly ~2.8 screens shorter, which would drop the reader past the whole
        // block; put them back at its heading once the column layout exists
        if (inside) requestAnimationFrame(() => window.scrollTo(0, sec.getBoundingClientRect().top + window.scrollY - 90));
      };
    });
  });

  /* ------------------------------------------------------- glass cursor */
  // a small frosted disc follows the mouse; over anything clickable its core lights up blue with a soft halo.
  // The native cursor is only hidden while our disc is actually on screen, so the visitor is never left without one.
  (() => {
    return; // 16.09.2026 (reviewer): a custom cursor gets in the way of clarity - the native cursor stays
    if (!window.matchMedia('(pointer: fine)').matches || !window.matchMedia('(hover: hover)').matches || reduceMotion) return;
    try { if (localStorage.getItem('cur') === 'off') return; } catch (e) { /* private mode */ }
    const HOT = 'a[href], button, summary, label, select, [role="button"], [data-modal-link], [data-xp-card], [tabindex]:not([tabindex="-1"]), input[type="checkbox"], input[type="radio"], input[type="range"], .opt';
    const TEXT = 'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="submit"]), textarea, [contenteditable="true"]';
    const el = document.createElement('div');
    el.className = 'cur';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<span class="cur__dot"></span>';
    document.body.appendChild(el);
    const root = document.documentElement;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let on = false;
    let queued = false;
    const show = () => { if (!on) { on = true; el.classList.add('is-on'); root.classList.add('cur-on'); } };
    const hide = () => { on = false; el.classList.remove('is-on', 'is-down'); root.classList.remove('cur-on'); }; // native cursor back
    // the native pointer is hidden, so the disc must sit exactly where the mouse is - no easing, one write per frame
    const draw = () => { queued = false; el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)'; };
    document.addEventListener('pointermove', (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') { hide(); return; } // a finger on a hybrid laptop
      x = e.clientX; y = e.clientY;
      if (!queued) { queued = true; requestAnimationFrame(draw); }
      show();
      const t = e.target;
      const hot = t && t.closest ? t.closest(HOT) : null;
      el.classList.toggle('is-hot', !!hot);
      el.classList.toggle('is-text', !!(t && t.closest && t.closest(TEXT)));
    }, { passive: true });
    document.addEventListener('pointerdown', (e) => { if (!e.pointerType || e.pointerType === 'mouse') el.classList.add('is-down'); });
    document.addEventListener('pointerup', () => el.classList.remove('is-down'));
    document.addEventListener('pointercancel', () => el.classList.remove('is-down'));
    document.addEventListener('mouseleave', hide);
    window.addEventListener('blur', hide);
    // an escape hatch for anyone who wants the native pointer back; remembered for later visits
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !e.altKey) return;
      try { localStorage.setItem('cur', 'off'); } catch (e2) { /* private mode */ }
      root.classList.remove('cur-on');
      el.remove();
    });
  })();

  /* ------------------------------ hero on phones: the tagline fits in two lines */
  // both lines are nowrap; the font shrinks until the widest rotating word and the second line fit the width
  (() => {
    const tag = $('.hero--home .hero__tagline');
    if (!tag) return;
    const l1 = $('.tag__l1', tag); const l2 = $('.tag__l2', tag); const word = $('[data-rot-word]', tag);
    const mq = window.matchMedia('(max-width: 720px)');
    let words = [];
    try { words = JSON.parse($('[data-hero-data]').textContent).rot || []; } catch { /* no data */ }
    const fit = () => {
      tag.style.fontSize = '';
      if (!mq.matches || !l1 || !l2) return;
      const cur = word ? word.textContent : '';
      const longest = words.reduce((a, b) => (b.length > a.length ? b : a), cur);
      if (word) word.textContent = longest;
      const max = tag.clientWidth;
      let size = parseFloat(getComputedStyle(tag).fontSize);
      for (let i = 0; i < 40 && (l1.scrollWidth > max || l2.scrollWidth > max) && size > 18; i++) {
        size -= 1; tag.style.fontSize = size + 'px';
      }
      if (word) word.textContent = cur;
    };
    fit();
    window.addEventListener('resize', fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  })();

  /* ------------------------------------------------- reviews: cards that fly out */
  // every five seconds the cards on screen fly out of frame and the next ones fly in from the other side;
  // clicking a card opens its screenshot full size over the blurred page (the shared modal does the opening)
  (() => {
    const shot = document.getElementById('modal-review');
    if (shot) {
      const img = $('[data-rv-shot]', shot);
      const cap = $('[data-rv-shot-q]', shot);
      // capture phase, so the picture is in place before the modal opener (a bubble-phase listener) shows it
      document.addEventListener('click', (e) => {
        const card = e.target instanceof Element ? e.target.closest('[data-rv-card]') : null;
        if (!card) return;
        if (img) { img.src = card.dataset.src || ''; img.alt = card.dataset.q || ''; }
        if (cap) cap.textContent = card.dataset.q || '';
      }, true);
    }

    $$('[data-rv]').forEach((rv) => {
      const grid = $('[data-rv-grid]', rv);
      const all = $$('[data-rv-card]', rv);
      const g = hasGsap ? window.gsap : null;
      if (!grid || !g || all.length < 3) return; // without GSAP (or with too few cards) the plain grid stays
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const pool = document.createElement('div');
      pool.className = 'rv__pool';
      rv.appendChild(pool);
      let cells = [];
      let queue = [];
      let slots = 0;
      let timer = null;
      let focus = false;
      let inView = false;

      let manual = rv.hasAttribute('data-rv-static'); // static (reviewer, 16.09.2026): arrows only; otherwise off once the visitor pages by hand
      const DELAY = 4000; // owner, 16.09.2026: 4 s, like every other auto slider
      const want = () => (window.matchMedia('(min-width: 1001px)').matches ? 4 : 2);
      const halt = () => { if (timer) { clearInterval(timer); timer = null; } };
      const swap = (cell, i, way) => {
        const old = cell.firstElementChild;
        const next = way < 0 ? queue.pop() : queue.shift();
        if (!old || !next) return;
        if (way < 0) queue.unshift(old); else queue.push(old);
        // forward: the left column leaves to the left, the right column to the right; backward: mirrored
        const dir = (i % 2 === 0 ? -1 : 1) * (way < 0 ? -1 : 1);
        cell.appendChild(next);
        g.to(old, {
          xPercent: dir * 125, yPercent: -10, rotate: dir * 5, opacity: 0, duration: .6, ease: 'power2.in',
          onComplete: () => { g.set(old, { clearProps: 'all' }); pool.appendChild(old); },
        });
        // the new card arrives from the same outer edge, so nothing ever flies across the other column
        g.fromTo(next, { xPercent: dir * 120, yPercent: 12, rotate: dir * 4, opacity: 0 },
          { xPercent: 0, yPercent: 0, rotate: 0, opacity: 1, duration: .8, ease: 'power3.out', delay: .16 });
      };
      let round = 0;
      let busy = 0;
      let pending = []; // the staggered swaps of the flight in progress
      // a flight still in the air is finished on the spot: the old cards go to the pool, the new ones settle
      const settle = () => {
        pending.forEach(clearTimeout);
        pending = [];
        cells.forEach((cell) => {
          while (cell.children.length > 1) {
            const old = cell.firstElementChild;
            g.killTweensOf(old);
            g.set(old, { clearProps: 'all' });
            pool.appendChild(old);
          }
          if (cell.firstElementChild) { g.killTweensOf(cell.firstElementChild); g.set(cell.firstElementChild, { clearProps: 'all' }); }
        });
        busy = 0;
      };
      const page = (way, force) => {
        if (document.querySelector('[data-modal]:not([hidden])')) return; // a screenshot is open: hold still
        if (busy > performance.now()) { if (!force) return; settle(); } // an arrow click cuts a flight short
        // with fewer spare cards than cells only that many cells change, a different set each time
        const n = Math.min(cells.length, queue.length);
        const from = (round++ * n) % cells.length;
        busy = performance.now() + 900 + n * 110;
        // backward runs through the cells in reverse, so a step back restores exactly the set a step forward replaced
        for (let k = 0; k < n; k++) {
          const i = (from + (way < 0 ? n - 1 - k : k)) % cells.length;
          pending.push(setTimeout(() => swap(cells[i], i, way), k * 110));
        }
      };
      const tick = () => page(1);
      const run = () => {
        if (timer || manual || !slots || all.length <= slots) return;
        if (!inView || focus || document.hidden) return;
        timer = setInterval(tick, DELAY);
      };
      const steer = (way) => { manual = true; halt(); page(way, true); };
      const bp = $('[data-rv-prev]', rv);
      const bn = $('[data-rv-next]', rv);
      if (bp) bp.addEventListener('click', () => steer(-1));
      if (bn) bn.addEventListener('click', () => steer(1));
      const teardown = () => {
        halt();
        pending.forEach(clearTimeout);
        pending = [];
        busy = 0;
        g.killTweensOf(all); // a flight still in progress would otherwise finish by parking its card in the pool
        cells.forEach((c) => c.remove());
        cells = [];
        slots = 0;
        rv.classList.remove('is-live');
        all.forEach((c) => { g.set(c, { clearProps: 'all' }); grid.appendChild(c); });
      };
      const build = (n) => {
        teardown();
        slots = n;
        rv.classList.add('is-live');
        all.forEach((c) => pool.appendChild(c));
        queue = all.slice();
        for (let i = 0; i < n; i++) {
          const cell = document.createElement('div');
          cell.className = 'rv__cell';
          cell.appendChild(queue.shift());
          grid.appendChild(cell);
          cells.push(cell);
        }
        run();
      };
      const sync = () => {
        const n = want();
        // Reduce Motion, or too few cards to have anything waiting in the wings: keep the plain grid
        if (mq.matches || all.length <= n) { teardown(); return; }
        if (n !== slots) build(n);
      };

      // the waiting cards are only visually hidden, so Tab and screen readers still reach every quote;
      // focusing one swaps it onto the stage in place of the card that has been visible the longest
      pool.addEventListener('focusin', (e) => {
        const card = e.target instanceof Element ? e.target.closest('[data-rv-card]') : null;
        const cell = cells[0];
        if (!card || !cell || !cell.firstElementChild) return;
        const shown = cell.firstElementChild;
        g.killTweensOf([card, shown]);
        g.set([card, shown], { clearProps: 'all' });
        queue.splice(queue.indexOf(card), 1);
        queue.unshift(shown);
        pool.appendChild(shown);
        cell.appendChild(card);
        card.focus({ preventScroll: true }); // moving a node drops its focus
      });
      // no pause on hover (owner: it must page by itself while on screen); keyboard focus still holds it
      rv.addEventListener('focusin', () => { focus = !!rv.querySelector(':focus-visible'); if (focus) halt(); });
      rv.addEventListener('focusout', () => { focus = false; run(); });
      document.addEventListener('visibilitychange', () => { if (document.hidden) halt(); else run(); });
      if (mq.addEventListener) mq.addEventListener('change', sync);
      let rt = null;
      window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(sync, 200); });
      if ('IntersectionObserver' in window) {
        new IntersectionObserver((es) => {
          inView = es.some((e) => e.isIntersecting);
          if (inView) run(); else halt();
        }, { threshold: .05 }).observe(rv); // starts as soon as the block shows up
      } else {
        inView = true;
      }
      sync();
      rv.__rv = { tick, page, run, halt, sync, cells: () => cells, queue: () => queue }; // debug hook
    });
  })();

  /* -------------------------------------------------------- html.js flag */
  document.documentElement.classList.add('js-ready');
})();
