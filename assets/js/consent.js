/* dyplomna.com - cookie consent (variant "C", 01.10.2026).
   The pill appears when no valid choice is saved; Reject / Accept / the settings dialog save {v, ana, mkt, t} in
   localStorage "dyp_consent" for 182 days and send Google Consent Mode v2 "update" (the "default" is set in <head> before
   Google Tag Manager) plus a dataLayer event "consent_update" for tags that do not read Consent Mode (e.g. Meta Pixel:
   in GTM give it the trigger "consent_update" with consent_marketing = granted, or a consent check on ad_storage).
   Any element with [data-cn-open] (the footer link "Cookie settings") reopens the dialog. */
(() => {
  'use strict';
  const KEY = 'dyp_consent';
  const VER = 1;
  const TTL = 182 * 864e5;
  const root = document.querySelector('[data-consent]');
  if (!root) return;
  const bar = root.querySelector('[data-cn-bar]');
  const dlg = root.querySelector('[data-cn-dialog]');
  const cats = Array.from(root.querySelectorAll('[data-cn-cat]'));
  const gtag = window.gtag || function () { (window.dataLayer = window.dataLayer || []).push(arguments); };
  const read = () => {
    try {
      const c = JSON.parse(localStorage.getItem(KEY));
      return c && c.v === VER && Date.now() - c.t < TTL ? c : null;
    } catch (e) { return null; }
  };
  const show = (el) => { if (!el || !el.hidden) return; el.hidden = false; requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-in'))); };
  const hide = (el) => { if (!el || el.hidden) return; el.classList.remove('is-in'); setTimeout(() => { el.hidden = true; }, 380); };
  const state = (c) => (c ? 'granted' : 'denied');
  const apply = (c) => {
    gtag('consent', 'update', { analytics_storage: state(c.ana), ad_storage: state(c.mkt), ad_user_data: state(c.mkt), ad_personalization: state(c.mkt) });
    (window.dataLayer = window.dataLayer || []).push({ event: 'consent_update', consent_analytics: state(c.ana), consent_marketing: state(c.mkt) });
    window.dypConsent = c;
    if (c.mkt) { if (window.dypStoreUtms) window.dypStoreUtms(); } else { try { localStorage.removeItem('utms'); } catch (e) { /* ignore */ } }
  };
  let lastFocus = null;
  const closeDlg = () => { hide(dlg); if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true }); lastFocus = null; };
  const save = (ana, mkt) => {
    const c = { v: VER, ana: !!ana, mkt: !!mkt, t: Date.now() };
    try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) { /* private mode: the choice lasts for this page */ }
    apply(c);
    hide(bar);
    if (dlg && !dlg.hidden) closeDlg();
  };
  const openDlg = () => {
    if (!dlg) return;
    const c = read() || window.dypConsent;
    cats.forEach((el) => { if (!el.disabled) el.checked = !!(c && c[el.dataset.cnCat]); });
    lastFocus = document.activeElement;
    show(dlg);
    setTimeout(() => { const f = dlg.querySelector('input:not([disabled])'); if (f) f.focus({ preventScroll: true }); }, 60);
  };
  document.addEventListener('click', (e) => {
    const t = e.target instanceof Element ? e.target.closest('[data-cn-accept],[data-cn-reject],[data-cn-save],[data-cn-open],[data-cn-close]') : null;
    if (!t) { if (dlg && !dlg.hidden && e.target === dlg) closeDlg(); return; }
    e.preventDefault();
    if (t.matches('[data-cn-accept]')) save(true, true);
    else if (t.matches('[data-cn-reject]')) save(false, false);
    else if (t.matches('[data-cn-save]')) {
      const on = (k) => { const el = cats.find((x) => x.dataset.cnCat === k); return !!(el && el.checked); };
      save(on('ana'), on('mkt'));
    } else if (t.matches('[data-cn-open]')) openDlg();
    else if (t.matches('[data-cn-close]')) closeDlg();
  });
  document.addEventListener('keydown', (e) => {
    if (!dlg || dlg.hidden) return;
    if (e.key === 'Escape') { closeDlg(); return; }
    if (e.key === 'Tab') { // keep the focus inside the dialog
      const f = Array.from(dlg.querySelectorAll('button, input:not([disabled])'));
      if (!f.length) return;
      const first = f[0]; const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  if (location.hash === '#cookie-settings') openDlg();
  else if (!read()) setTimeout(() => show(bar), 600);
})();
