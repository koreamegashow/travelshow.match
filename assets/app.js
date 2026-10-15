(function () {
  'use strict';
  const core = window.TravelshowCore;
  const dictionaries = window.TRAVELSHOW_I18N;
  const config = window.TRAVELSHOW_CONFIG;
  const form = document.getElementById('applicationForm');
  const controlSet = document.getElementById('formControls');
  const dialog = document.getElementById('resultDialog');
  const brochureDialog = document.getElementById('brochureDialog');
  const catalog = Array.isArray(config.distributors) ? config.distributors : [];
  const countedFields = ['productDetail', 'distributionDetail', 'distributionNotes'];
  let language = 'ko';
  try { const stored = localStorage.getItem('travelshow-language'); if (dictionaries[stored]) language = stored; } catch (_) { /* The form also works with storage disabled. */ }
  let busy = false;
  let errors = [];
  let dialogState = null;
  let brochureId = '';
  let statusKey = '';
  const t = (key, params = {}) => {
    let value = key.split('.').reduce((obj, part) => obj && obj[part], dictionaries[language]) ?? key;
    Object.entries(params).forEach(([name, text]) => { value = value.replaceAll('{' + name + '}', text); });
    return value;
  };
  const escape = text => String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  function distributorText(item, field) { const value = item[field]; return typeof value === 'string' ? value : value && (value[language] || value.ko || value.en || value.ja) || ''; }
  function textField(name, { area = false, full = false, hint = '', placeholder = 'nonePlaceholder', autocomplete = 'off', mode = 'text' } = {}) {
    const counted = countedFields.includes(name);
    return `<div class="field ${full ? 'full' : ''}"><label class="field-label" for="${name}"><span data-i18n="fields.${name}"></span><span class="required-mark" aria-hidden="true">*</span></label>${hint ? `<span class="field-help" id="${name}-help" data-i18n="${hint}"></span>` : ''}<${area ? 'textarea rows="4"' : 'input type="text"'} id="${name}" class="control" name="${name}" required maxlength="${core.MAX_TEXT}" inputmode="${mode}" autocomplete="${autocomplete}" aria-describedby="${hint ? name + '-help ' : ''}${counted ? name + '-count ' : ''}${name}-error" ${placeholder ? `data-i18n-placeholder="${placeholder}"` : ''}>${area ? '</textarea>' : ''}${counted ? `<span class="field-limit"><output id="${name}-count" for="${name}">0 / ${core.MAX_TEXT}</output></span>` : ''}<p class="field-error" id="${name}-error"></p></div>`;
  }
  function choices(name, codes, single = false, hint = single ? '' : 'multiHelp') {
    const options = codes.map((code, i) => {
      const other = core.OTHER_CHOICES.find(item => item.group === name && item.code === code);
      if (other) return `<div class="choice other-choice"><label class="other-option"><input type="${single ? 'radio' : 'checkbox'}" id="${other.field}Choice" name="${name}" value="${code}" ${single ? 'required' : ''}><span data-i18n="choices.${code}"></span></label><label class="sr-only" for="${other.field}" data-i18n="fields.${other.field}"></label><input class="control other-control" type="text" id="${other.field}" name="${other.field}" maxlength="${core.MAX_TEXT}" autocomplete="off" data-i18n-placeholder="${other.field}Placeholder" aria-describedby="${other.field}-error"><p class="field-error" id="${other.field}-error"></p></div>`;
      return `<label class="choice"><input type="${single ? 'radio' : 'checkbox'}" name="${name}" value="${code}" ${single ? 'required' : ''} ${i === 0 ? `id="${name}"` : ''}><span data-i18n="choices.${code}"></span></label>`;
    }).join('');
    return `<fieldset class="choice-field" id="${name}-group" aria-describedby="${hint ? name + '-help ' : ''}${name}-error"><legend class="field-label"><span data-i18n="fields.${name}"></span><span class="required-mark" aria-hidden="true">*</span></legend>${hint ? `<span class="field-help" id="${name}-help" data-i18n="${hint}"></span>` : ''}<div class="choice-grid">${options}</div><p class="field-error" id="${name}-error"></p></fieldset>`;
  }
  document.getElementById('companyFields').innerHTML = [
    textField('companyName', { full: true, placeholder: '', autocomplete: 'organization' }), choices('businessType', core.BUSINESS, true),
    textField('foundedDate', { placeholder: 'datePlaceholder' }), textField('employeeCount', { placeholder: 'employeePlaceholder' }),
    textField('managerName', { placeholder: '', autocomplete: 'name' }), textField('managerTitle', { placeholder: '', autocomplete: 'organization-title' }),
    textField('officePhone', { placeholder: 'officePhonePlaceholder', hint: 'phoneHelp', autocomplete: 'tel', mode: 'tel' }),
    textField('mobilePhone', { placeholder: 'phonePlaceholder', hint: 'phoneHelp', autocomplete: 'tel', mode: 'tel' }),
    textField('email', { placeholder: 'emailPlaceholder', autocomplete: 'email' }), textField('homepage', { placeholder: 'websitePlaceholder', autocomplete: 'url' })
  ].join('');
  document.getElementById('distributionFields').innerHTML = [
    textField('productDetail', { area: true, full: true, placeholder: 'productPlaceholder' }),
    choices('interestChannels', core.CHANNELS, false, 'interestChannelsHelp'), choices('currentChannels', core.CHANNELS, false, 'currentChannelsHelp'),
    textField('distributionDetail', { area: true, full: true, placeholder: 'distributionPlaceholder' }),
    textField('distributionNotes', { area: true, full: true, placeholder: 'notesPlaceholder' })
  ].join('');
  document.getElementById('purposeFields').innerHTML = choices('meetingGoals', core.GOALS) + choices('randomMatch', ['YES', 'NO'], true, 'randomHelp');
  document.getElementById('rankingFields').innerHTML = Array.from({ length: 10 }, (_, i) => `<div class="field"><label class="field-label" for="rank${i + 1}"><span data-rank="${i + 1}"></span>${i === 0 ? '<span class="required-mark" aria-hidden="true">*</span>' : ''}</label><select class="control" id="rank${i + 1}" name="rank${i + 1}" ${i === 0 ? 'required' : ''} disabled aria-describedby="rank1-error"><option value="" data-i18n="rankPlaceholder"></option>${catalog.map(x => `<option value="${escape(x.id)}">${escape(distributorText(x, 'name'))}</option>`).join('')}</select>${i === 0 ? '<p id="rank1-error" class="field-error"></p>' : ''}</div>`).join('');
  const sections = [['company-section', 'companySection'], ['distribution-section', 'distributionNav'], ['purpose-section', 'purposeSection'], ['matching-section', 'matchingNav'], ['confirm-section', 'confirmSection']];
  document.getElementById('stepNav').innerHTML = '<ol>' + sections.map(([id, label], i) => `<li><a href="#${id}" ${i === 0 ? 'class="active"' : ''}><span>${String(i + 1).padStart(2, '0')}</span><b data-i18n="${label}"></b></a></li>`).join('') + '</ol>';
  function selected(name) { return Array.from(form.querySelectorAll(`input[name="${name}"]:checked`), el => el.value); }
  function collect() {
    const data = { schemaVersion: core.SCHEMA_VERSION, language, consentVersion: config.consentVersion, businessType: selected('businessType')[0] || '', interestChannels: selected('interestChannels'), currentChannels: selected('currentChannels'), meetingGoals: selected('meetingGoals'), randomMatch: selected('randomMatch')[0] || '', privacyAgree: form.elements.privacyAgree.checked, confirmationAgree: form.elements.confirmationAgree.checked, rankings: [] };
    core.TEXT_FIELDS.forEach(name => { data[name] = form.elements[name].value; });
    core.OTHER_CHOICES.forEach(({ group, code, field }) => { data[field] = selected(group).includes(code) ? form.elements[field].value : ''; });
    for (let rank = 1; rank <= 10; rank++) if (form.elements['rank' + rank].value) data.rankings.push({ rank, retailerId: form.elements['rank' + rank].value });
    return data;
  }
  function syncOtherChoices() {
    core.OTHER_CHOICES.forEach(({ group, code, field }) => {
      const selectedOther = selected(group).includes(code);
      form.elements[field].required = selectedOther;
      form.elements[field].setAttribute('aria-required', String(selectedOther));
    });
  }
  function refreshRanks() {
    const selections = Array.from({ length: 10 }, (_, i) => form.elements['rank' + (i + 1)].value);
    for (let i = 0; i < 10; i++) {
      const el = form.elements['rank' + (i + 1)];
      el.disabled = busy || !config.catalogReady || !catalog.length;
      const available = catalog.filter(item => !selections.some((value, other) => other !== i && value === item.id));
      el.innerHTML = `<option value="">${escape(t('rankPlaceholder'))}</option>` + available.map(item => `<option value="${escape(item.id)}">${escape(distributorText(item, 'name'))}</option>`).join('');
      el.value = selections[i];
    }
    refreshMatching();
  }
  function refreshMatching() {
    const count = config.catalogReady ? catalog.length : 0;
    const selectedCount = Array.from({ length: 10 }, (_, i) => form.elements['rank' + (i + 1)].value).filter(Boolean).length;
    const state = core.matchingState(config.catalogReady, count, selectedCount);
    document.getElementById('matchedDistributorCount').textContent = t('matchCount', { n: count });
    const notice = document.getElementById('catalogNotice');
    notice.textContent = t(state, { n: selectedCount });
    notice.classList.toggle('is-empty', state === 'catalogEmpty');
  }
  function renderCatalog() {
    const list = document.getElementById('matchedList');
    const items = config.catalogReady ? catalog : [];
    list.hidden = !items.length;
    list.innerHTML = items.map(item => {
      const detail = field => escape(distributorText(item, field) || '-');
      return `<article class="distributor-card"><div class="distributor-copy"><div class="distributor-header"><h3>${detail('name')}</h3><button type="button" class="button brochure-button" data-brochure-id="${escape(item.id)}" aria-haspopup="dialog" aria-controls="brochureDialog" aria-label="${escape(t('brochureButton'))}: ${detail('name')}">${escape(t('brochureButton'))}</button></div><dl class="distributor-details"><div><dt>${escape(t('catalogBusiness'))}</dt><dd>${detail('businessFields')}</dd></div><div><dt>${escape(t('catalogIntro'))}</dt><dd>${detail('companyIntro')}</dd></div><div><dt>${escape(t('catalogRequest'))}</dt><dd><div class="request-line"><span class="request-label">${escape(t('catalogItems'))}</span> ${detail('meetingItems')}</div><div class="request-line"><span class="request-label">${escape(t('catalogPurpose'))}</span> ${detail('meetingPurpose')}</div></dd></div></dl></div></article>`;
    }).join('');
  }
  function refreshCounts() { countedFields.forEach(name => { document.getElementById(name + '-count').textContent = form.elements[name].value.length + ' / ' + core.MAX_TEXT; }); }
  function preview() {
    const data = collect();
    const names = ['companyName', 'managerName', 'productDetail', 'businessType', 'interestChannels', 'rankings'];
    document.getElementById('previewContent').innerHTML = names.map(name => {
      let value = data[name];
      if (name === 'rankings') value = value.map(x => t('rank', { n: x.rank }) + ': ' + distributorText(catalog.find(y => y.id === x.retailerId), 'name')).join('\n');
      else if (Array.isArray(value)) value = value.map(x => t('choices.' + x) + (x === 'CHANNEL_OTHER' && data.interestChannelsOther ? ': ' + data.interestChannelsOther : '')).join(', ');
      else if (['businessType', 'randomMatch'].includes(name) && value) value = t('choices.' + value) + (name === 'businessType' && data.businessTypeOther ? ': ' + data.businessTypeOther : '');
      return '<div class="summary-card"><dt>' + escape(t('fields.' + name)) + '</dt><dd>' + escape(value || '-') + '</dd></div>';
    }).join('');
  }
  function displayErrors() {
    form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
    form.querySelectorAll('.field-error').forEach(el => { el.textContent = ''; });
    errors.forEach(error => {
      const message = document.getElementById(error.field + '-error');
      if (message) message.textContent = t('errors.' + error.code);
      const field = document.getElementById(error.field);
      if (field) field.setAttribute('aria-invalid', 'true');
      const group = document.getElementById(error.field + '-group');
      if (group) group.setAttribute('aria-invalid', 'true');
    });
  }
  function canSubmit() {
    return config.enableSubmission && config.catalogReady && catalog.length && config.consentVersion && /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(config.googleAppsScriptUrl);
  }
  function refreshDialog() {
    if (!dialogState) return;
    const success = dialogState.success;
    dialog.classList.toggle('is-failure', !success);
    dialog.setAttribute('role', success ? 'dialog' : 'alertdialog');
    document.getElementById('dialogIcon').textContent = success ? '✓' : '!';
    document.getElementById('dialogTitle').textContent = t(success ? 'successTitle' : 'failureTitle');
    document.getElementById('dialogDescription').textContent = t(success ? 'successText' : 'failureText');
    document.getElementById('receiptText').textContent = success ? t('receipt', { id: dialogState.id }) : '';
    document.getElementById('dialogButton').textContent = t(success ? 'confirm' : 'retry');
  }
  function openDialog(state) { dialogState = state; refreshDialog(); dialog.showModal(); document.getElementById('dialogButton').focus(); }
  function refreshBrochureDialog() {
    const item = catalog.find(item => item.id === brochureId);
    document.getElementById('brochureCompany').textContent = item ? distributorText(item, 'name') : '';
  }
  function applyLanguage() {
    document.documentElement.lang = language;
    document.title = t('pageTitle');
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    document.querySelectorAll('[data-rank]').forEach(el => { el.textContent = t('rank', { n: el.dataset.rank }); });
    document.querySelectorAll('[data-language]').forEach(el => { el.setAttribute('aria-pressed', String(el.dataset.language === language)); });
    document.querySelectorAll('[data-brand-logo]').forEach(logo => { logo.src = language === 'ko' ? 'assets/logo-ko.png' : 'assets/logo-international.png'; logo.alt = language === 'ko' ? '트래블쇼' : 'Travel Show'; });
    document.getElementById('submitButton').textContent = t(busy ? 'submitting' : 'submit');
    document.getElementById('statusMessage').textContent = statusKey ? t(statusKey) : '';
    syncOtherChoices(); refreshCounts(); refreshRanks(); renderCatalog(); preview(); displayErrors(); refreshDialog(); refreshBrochureDialog();
  }
  function setBusy(value) {
    busy = value; controlSet.disabled = busy;
    form.setAttribute('aria-busy', String(busy));
    refreshRanks(); document.getElementById('submitButton').textContent = t(busy ? 'submitting' : 'submit');
  }
  const newId = () => crypto.randomUUID ? crypto.randomUUID() : 'ts-' + Date.now() + '-' + Math.random().toString(36).slice(2);
  const send = core.makeSubmitter({ endpoint: config.googleAppsScriptUrl, fetchImpl: (...args) => fetch(...args), newId });
  form.addEventListener('input', event => {
    const other = core.OTHER_CHOICES.find(item => item.field === event.target.name);
    if (other && event.target.value.trim()) document.getElementById(other.field + 'Choice').checked = true;
    syncOtherChoices(); refreshCounts(); preview();
  });
  form.addEventListener('change', event => {
    syncOtherChoices(); refreshRanks(); preview();
  });
  document.querySelectorAll('[data-language]').forEach(button => button.addEventListener('click', () => {
    language = button.dataset.language;
    try { localStorage.setItem('travelshow-language', language); } catch (_) { /* Language selection does not depend on storage. */ }
    applyLanguage();
  }));
  document.getElementById('dialogButton').addEventListener('click', () => { dialog.close(); document.getElementById('submitButton').focus(); });
  document.getElementById('matchedList').addEventListener('click', event => {
    const button = event.target.closest('[data-brochure-id]');
    if (!button) return;
    brochureId = button.dataset.brochureId;
    refreshBrochureDialog(); brochureDialog.showModal(); document.getElementById('brochureClose').focus();
  });
  document.getElementById('brochureClose').addEventListener('click', () => brochureDialog.close());
  brochureDialog.addEventListener('close', () => {
    const button = Array.from(document.querySelectorAll('[data-brochure-id]')).find(button => button.dataset.brochureId === brochureId);
    if (button) button.focus();
    brochureId = '';
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    if (!canSubmit()) { statusKey = 'setupPending'; applyLanguage(); document.getElementById('statusMessage').scrollIntoView({ block: 'center' }); return; }
    const data = collect();
    errors = core.validate({ ...data, submissionId: newId() }, catalog);
    displayErrors();
    if (errors.length) {
      statusKey = 'validationSummary'; applyLanguage();
      const target = document.getElementById(errors[0].field); if (target) target.focus();
      return;
    }
    statusKey = ''; applyLanguage(); setBusy(true);
    let result = null;
    try { result = await send(data); }
    catch (_) { openDialog({ success: false }); }
    finally { setBusy(false); }
    // Clear only after a matching server acknowledgement confirms the row was saved.
    if (result) { form.reset(); errors = []; statusKey = ''; refreshRanks(); applyLanguage(); openDialog({ success: true, id: result.submissionId }); }
  });
  if (typeof IntersectionObserver !== 'undefined') {
    const observer = new IntersectionObserver(entries => { const visible = entries.filter(x => x.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]; if (visible) document.querySelectorAll('#stepNav a').forEach(link => { const active = link.hash === '#' + visible.target.id; link.classList.toggle('active', active); if (active) link.setAttribute('aria-current', 'step'); else link.removeAttribute('aria-current'); }); }, { rootMargin: '-10% 0px -55% 0px', threshold: 0 });
    sections.forEach(([id]) => observer.observe(document.getElementById(id)));
  }
  refreshRanks(); applyLanguage();
})();
