import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { lessons as coreLessons } from '../../dist/data/curriculum.js';
import { jobEvidence } from '../../dist/data/job-evidence.js';
import { externalReferenceUrl } from '../../desktop/reference-policy.cjs';

const projectRoot = new URL('../../', import.meta.url);
const text = (relative) => readFile(new URL(relative, projectRoot), 'utf8');

test('every core and professional lesson source is permitted by the desktop external link policy', async () => {
  const catalog = JSON.parse(await text('curriculum/professional/catalog.json'));
  // Read canonical inputs, so this guard also runs before generated assets exist.
  const professionalLessons = await Promise.all(catalog.lessons.map(async (entry) => JSON.parse(await text(`curriculum/professional/${entry.lessonPath}`))));
  const lessons = [...coreLessons, ...professionalLessons];
  assert.equal(lessons.length, 34);
  let checked = 0;
  for (const lesson of lessons) {
    assert.ok(lesson.sources.length > 0, `Missing sources for ${lesson.id}`);
    for (const source of lesson.sources) {
      assert.equal(externalReferenceUrl(source.url), new URL(source.url).href, `${lesson.id}: ${source.url}`);
      checked++;
    }
  }
  assert.equal(checked, 90);
});

test('hiring evidence, actual UI links and installation guide downloads remain accessible', async () => {
  const uiFiles = await Promise.all(['dist/index.html', 'dist/app.js'].map(text));
  const uiUrls = uiFiles.flatMap((content) => [...content.matchAll(/https:\/\/[^\s'"<>`]+/g)].map((match) => match[0]));
  const installUrls = [...(await text('docs/installation.md')).matchAll(/\]\((https:\/\/[^\s)]+)\)/g)].map((match) => match[1]);
  assert.ok(uiUrls.some((url) => url.startsWith('https://github.com/jbsim999/java-edu/releases')));
  // Bundled releases replaced the former mandatory JDK/Maven download steps.
  // Require the actual learner downloads while retaining the host allowlist
  // checks for every documented and rendered link below.
  for (const extension of ['exe', 'zip']) {
    assert.ok(installUrls.some((value) => {
      const url = new URL(value);
      return url.hostname === 'github.com'
        && new RegExp(`^/jbsim999/java-edu/releases/download/v[^/]+/[^/]+\\.${extension}$`, 'i').test(url.pathname);
    }), `Missing direct ${extension.toUpperCase()} bundled release download`);
  }
  assert.equal(jobEvidence.length, 5);
  for (const url of [...jobEvidence.map((entry) => entry.url), ...uiUrls, ...installUrls]) {
    assert.equal(externalReferenceUrl(url), new URL(url).href, url);
  }
});

test('external links reject protocols, credentials, ports and host confusion', () => {
  for (const value of [
    undefined, null, {}, '', 'not a URL',
    'http://docs.junit.org/5.11.4/user-guide/',
    'javascript:alert(1)', 'file:///C:/Windows/System32/cmd.exe', 'data:text/html,hello',
    'mailto:help@docs.junit.org', '//docs.junit.org/',
    'https://attacker.invalid/', 'https://docs.junit.org.attacker.invalid/',
    'https://subdomain.docs.junit.org/', 'https://docs.junit.org./',
    'https://docs.junit.org@attacker.invalid/', 'https://user:secret@docs.junit.org/',
    'https://@docs.junit.org/', 'https://docs.junit.org:443/', 'https://docs.junit.org:8443/',
    'https://docs.junit.org:/', 'https://%64ocs.junit.org/',
    'https://docs.junit.org\\@attacker.invalid/', 'https:\\docs.junit.org/',
    ' https://docs.junit.org/', 'https://docs.ju\tnit.org/', 'https://docs.junit.org/\n',
    'https://127.0.0.1/', 'https://[::1]/',
  ]) assert.equal(externalReferenceUrl(value), null, String(value));
});

test('approved reference links preserve document paths, query strings and fragments', () => {
  for (const url of [
    'https://docs.hibernate.org/orm/6.6/userguide/html_single/#locking-optimistic',
    'https://adoptium.net/temurin/releases/?version=21',
    'https://github.com/jbsim999/java-edu/releases',
  ]) assert.equal(externalReferenceUrl(url), url);
});
