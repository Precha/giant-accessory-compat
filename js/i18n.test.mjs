import test from 'node:test';
import assert from 'node:assert/strict';
import { t, getLang, setLang, TRANSLATIONS } from './i18n.mjs';

test('default language is en (localStorage unavailable in Node, falls back to en)', () => {
  assert.equal(getLang(), 'en');
});

test('t() returns English string for a known key', () => {
  assert.equal(t('byModel'), TRANSLATIONS.en.byModel);
  assert.equal(t('statusYes'), 'Compatible');
});

test('t() returns the key itself for an unknown key rather than crashing', () => {
  assert.equal(t('___not_a_real_key___'), '___not_a_real_key___');
});

test('setLang switches the active language and t() reflects the change', () => {
  setLang('zh');
  assert.equal(getLang(), 'zh');
  assert.equal(t('byModel'), TRANSLATIONS.zh.byModel);
  assert.equal(t('statusYes'), '適用');
  setLang('en'); // restore
});

test('setLang ignores unknown language codes', () => {
  const before = getLang();
  setLang('fr');
  assert.equal(getLang(), before);
});

test('TRANSLATIONS has identical key sets for both languages (completeness)', () => {
  const enKeys = Object.keys(TRANSLATIONS.en).sort();
  const zhKeys = Object.keys(TRANSLATIONS.zh).sort();
  assert.deepEqual(enKeys, zhKeys);
});
