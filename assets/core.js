(function (root) {
  'use strict';
  const MAX_TEXT = 700;
  const SCHEMA_VERSION = 'travelshow_application_v5';
  const TEXT_FIELDS = ['companyName', 'productDetail', 'foundedDate', 'employeeCount', 'managerName', 'managerTitle', 'officePhone', 'mobilePhone', 'email', 'homepage', 'distributionDetail', 'distributionNotes'];
  const ACTUAL_INFO_FIELDS = ['companyName', 'foundedDate', 'employeeCount', 'managerName', 'managerTitle', 'officePhone', 'mobilePhone', 'email'];
  const BUSINESS = ['PARTNER_LOCAL', 'PARTNER_JAPAN', 'PARTNER_FOREIGN', 'PARTNER_INBOUND_AGENCY', 'PARTNER_OUTBOUND_AGENCY', 'PARTNER_LAND_OPERATOR', 'PARTNER_GROUP_INCENTIVE', 'PARTNER_OTA', 'PARTNER_STAY', 'PARTNER_GOODS', 'PARTNER_LOCAL_TOURISM', 'PARTNER_FOREIGN_TOURISM', 'PARTNER_OTHER'];
  const CHANNELS = ['CHANNEL_OUTBOUND_AGENCY', 'CHANNEL_INBOUND_AGENCY', 'CHANNEL_LAND_OPERATOR', 'CHANNEL_GROUP_INCENTIVE', 'CHANNEL_MARKETING', 'CHANNEL_MEDIA', 'CHANNEL_OTA', 'CHANNEL_INVESTMENT_PARTNERSHIP', 'CHANNEL_DISTRIBUTOR', 'CHANNEL_EVENT', 'CHANNEL_GOVERNMENT', 'CHANNEL_OTHER'];
  const GOALS = ['GOAL_TOUR_SUPPLY', 'GOAL_STAY_SUPPLY', 'GOAL_PLATFORM_LISTING', 'GOAL_GOODS_DISTRIBUTION', 'GOAL_CO_DEVELOP', 'GOAL_GROUP_EVENT', 'GOAL_VISITOR_COOP', 'GOAL_REGION_PROMOTION', 'GOAL_PRODUCT_PROMOTION', 'GOAL_JOINT_PROMO', 'GOAL_OTHER'];
  const OTHER_CHOICES = [
    { group: 'businessType', code: 'PARTNER_OTHER', field: 'businessTypeOther' },
    { group: 'interestChannels', code: 'CHANNEL_OTHER', field: 'interestChannelsOther' },
    { group: 'currentChannels', code: 'CHANNEL_OTHER', field: 'currentChannelsOther' },
    { group: 'meetingGoals', code: 'GOAL_OTHER', field: 'meetingGoalOther' }
  ];
  const HEADERS = ['제출일시', '접수ID', '요청해시', '신청언어', '양식버전', '회사명', '사업형태코드', '상담 상품&콘텐츠', '회사 설립일', '직원 수', '담당자', '직함', '사무실 번호', '휴대폰 번호', '이메일 주소', '홈페이지 주소', '관심 유통채널코드', '현재 유통현황코드', '유통 현황 상세', '기타 유통 특이사항', '상담 목적코드', '임의매칭 동의', '개인정보 동의', '동의문 버전', '1순위ID', '2순위ID', '3순위ID', '4순위ID', '5순위ID', '6순위ID', '7순위ID', '8순위ID', '9순위ID', '10순위ID', '1순위 유통사', '2순위 유통사', '3순위 유통사', '4순위 유통사', '5순위 유통사', '6순위 유통사', '7순위 유통사', '8순위 유통사', '9순위 유통사', '10순위 유통사', '접수 안내 확인', '상담 목적 기타', '사업형태 기타', '관심 유통채널 기타', '현재 유통현황 기타'];
  function isNone(value) { return /^(없음|해당\s*없음|なし|該当なし|none|n\/?a|not applicable)$/i.test(String(value).trim()); }
  function canonicalText(value) { return isNone(value) ? 'NONE' : String(value).trim(); }
  function validPhone(value) {
    const text = String(value).trim();
    const base = text.replace(/\s*(?:ext\.?|x|내선|内線)\s*\d{1,6}$/i, '');
    return /^\+?[\d\s().-]+$/.test(base) && base.replace(/\D/g, '').length >= 6 && base.replace(/\D/g, '').length <= 20;
  }
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [y, m, d] = value.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return y >= 1000 && date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  }
  function validEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
  function validWebsite(value) {
    if (isNone(value) || value === 'NONE') return true;
    return /^https?:\/\/[^\s/?#]+(?:[/?#][^\s]*)?$/i.test(value) || /^(?:[a-z\d-]+\.)+[a-z]{2,}(?:\/[^\s]*)?$/i.test(value);
  }
  function safeSheetValue(value) {
    const text = String(value == null ? '' : value);
    // Escape formula prefixes even when concealed by whitespace or control characters.
    return /^[\s\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060\ufeff]*[=+\-@]/u.test(text) ? "'" + text : text;
  }
  function matchingState(ready, count, selectedCount) {
    if (!ready) return 'catalogPending';
    if (count === 0) return 'catalogEmpty';
    return selectedCount > 0 ? 'catalogSelected' : 'catalogReady';
  }
  function validate(payload, catalog) {
    const errors = [];
    const add = (field, code) => errors.push({ field, code });
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return [{ field: '', code: 'INVALID_REQUEST' }];
    if (payload.schemaVersion !== SCHEMA_VERSION || !['ko', 'ja', 'en'].includes(payload.language) || !/^[a-z\d-]{16,80}$/i.test(payload.submissionId || '')) add('', 'INVALID_REQUEST');
    TEXT_FIELDS.forEach(field => {
      if (typeof payload[field] !== 'string' || !payload[field].trim()) add(field, 'REQUIRED');
      else if (payload[field].length > MAX_TEXT) add(field, 'TOO_LONG');
      else if (ACTUAL_INFO_FIELDS.includes(field) && isNone(payload[field])) add(field, 'ACTUAL_REQUIRED');
    });
    if (!BUSINESS.includes(payload.businessType)) add('businessType', 'REQUIRED');
    [['interestChannels', CHANNELS], ['currentChannels', CHANNELS], ['meetingGoals', GOALS]].forEach(([field, allowed]) => {
      const values = payload[field];
      if (!Array.isArray(values) || !values.length || values.length > allowed.length || values.some(x => !allowed.includes(x)) || new Set(values).size !== values.length) add(field, field === 'meetingGoals' ? 'GOAL_REQUIRED' : 'CHOICE_REQUIRED');
    });
    OTHER_CHOICES.forEach(({ group, code, field }) => {
      const selected = Array.isArray(payload[group]) ? payload[group].includes(code) : payload[group] === code;
      const detail = payload[field];
      if (selected && (typeof detail !== 'string' || !detail.trim())) add(field, 'REQUIRED');
      if (detail !== undefined && typeof detail !== 'string') add(field, 'INVALID_REQUEST');
      else if (typeof detail === 'string' && detail.length > MAX_TEXT) add(field, 'TOO_LONG');
      else if (!selected && detail && detail.trim()) add(field, 'INVALID_REQUEST');
    });
    const hasActualText = field => typeof payload[field] === 'string' && payload[field].trim() && !isNone(payload[field]);
    if (hasActualText('foundedDate') && !validDate(payload.foundedDate)) add('foundedDate', 'INVALID_DATE');
    if (hasActualText('employeeCount') && !/^\d+$/.test(payload.employeeCount)) add('employeeCount', 'INVALID_NUMBER');
    ['officePhone', 'mobilePhone'].forEach(field => { if (hasActualText(field) && !validPhone(payload[field])) add(field, 'INVALID_PHONE'); });
    if (hasActualText('email') && !validEmail(payload.email)) add('email', 'INVALID_EMAIL');
    if (!validWebsite(payload.homepage || '')) add('homepage', 'INVALID_URL');
    if (!['YES', 'NO'].includes(payload.randomMatch)) add('randomMatch', 'REQUIRED');
    if (payload.privacyAgree !== true || typeof payload.consentVersion !== 'string' || !payload.consentVersion || payload.consentVersion.length > MAX_TEXT) add('privacyAgree', 'CONSENT_REQUIRED');
    if (payload.confirmationAgree !== true) add('confirmationAgree', 'CONFIRMATION_REQUIRED');
    const ranks = payload.rankings;
    const ids = new Set((catalog || []).map(x => x.id));
    if (!Array.isArray(ranks) || !ranks.length || ranks.length > 10) add('rank1', 'RANK_REQUIRED');
    else if (ranks.some((x, i) => !x || x.rank !== i + 1 || !ids.has(x.retailerId)) || new Set(ranks.map(x => x.retailerId)).size !== ranks.length) add('rank1', 'INVALID_RANK');
    return errors;
  }
  // A retry reuses the same ID and exact data until the applicant changes the form.
  function makeSubmitter({ endpoint, fetchImpl, timeoutMs = 30000, newId }) {
    let previous = null;
    return async function submit(data) {
      const fingerprintData = { ...data };
      delete fingerprintData.language;
      const fingerprint = JSON.stringify(fingerprintData);
      if (!previous || previous.fingerprint !== fingerprint) previous = { fingerprint, payload: { ...data, submissionId: newId() } };
      const sent = previous.payload;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(sent), signal: controller.signal, redirect: 'follow' });
        if (!response.ok) throw new Error('SUBMISSION_FAILED');
        const result = await response.json();
        if (!result || result.ok !== true || result.submissionId !== sent.submissionId || result.saved !== true) throw new Error(result && result.code || 'SUBMISSION_FAILED');
        previous = null;
        return result;
      } finally { clearTimeout(timer); }
    };
  }
  const api = { MAX_TEXT, SCHEMA_VERSION, TEXT_FIELDS, ACTUAL_INFO_FIELDS, BUSINESS, CHANNELS, GOALS, OTHER_CHOICES, HEADERS, isNone, canonicalText, validPhone, validDate, validEmail, validWebsite, safeSheetValue, matchingState, validate, makeSubmitter };
  root.TravelshowCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
