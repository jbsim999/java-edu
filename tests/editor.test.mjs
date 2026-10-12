import assert from 'node:assert/strict';
import test from 'node:test';
import { javaHighlightSpans } from '../dist/editor.js';

function tokens(source) {
  const spans = javaHighlightSpans(source);
  let end = 0;
  for (const span of spans) {
    assert.ok(Number.isInteger(span.from) && Number.isInteger(span.to));
    assert.ok(span.from >= end && span.to > span.from && span.to <= source.length, 'highlight spans stay ordered and within the source');
    assert.match(span.classes, /^tok-[a-z]+(?: tok-[a-z]+)*$/);
    end = span.to;
  }
  return spans.map(span => ({ text: source.slice(span.from, span.to), classes: span.classes }));
}

function contains(entries, text, category) {
  assert.ok(entries.some(entry => entry.text === text && entry.classes.split(' ').includes(`tok-${category}`)), `${JSON.stringify(text)} is highlighted as ${category}`);
}

test('Java syntax distinguishes class declarations, types, variables, and method declarations and calls', () => {
  const entries = tokens('class Palette { String label = "한글"; int count = 7; void run() { count++; run(); } }');
  for (const [text, category] of [
    ['class', 'keyword'], ['Palette', 'class'], ['String', 'type'], ['int', 'type'],
    ['label', 'variable'], ['count', 'variable'], ['run', 'method'], ['"한글"', 'string'], ['7', 'number'],
  ]) contains(entries, text, category);
  assert.equal(entries.filter(entry => entry.text === 'run' && entry.classes === 'tok-method').length, 2, 'declaration and invocation share the method category');
});

test('Comments and string literals keep Java-looking and HTML-looking text in their own category', () => {
  const comment = '// class Fake { int unsafe = 1; }';
  const literal = '"<img src=x onerror=alert(1)> class Fake"';
  const entries = tokens(`class Safe { ${comment}\nString value = ${literal}; }`);
  contains(entries, comment, 'comment');
  contains(entries, literal, 'string');
  assert.equal(entries.some(entry => entry.text === 'Fake' && entry.classes === 'tok-class'), false);
});

test('Supported lesson syntax keeps class and type categories for generic, record, sealed, and text-block examples', () => {
  const entries = tokens('sealed interface Shape permits Box {}\nrecord Box<T>(T value) implements Shape {}\nclass Demo { String text = """\n한글\n"""; }');
  for (const [text, category] of [['Shape', 'class'], ['Box', 'class'], ['Demo', 'class'], ['sealed', 'keyword'], ['record', 'keyword'], ['String', 'type']]) contains(entries, text, category);
  assert.ok(entries.some(entry => entry.classes === 'tok-string' && entry.text.includes('한글')));
});

test('Empty, incomplete, Unicode, and trailing-newline source yields bounded syntax spans without mutation', () => {
  for (const source of ['', '\n\n', 'class', 'class 한글 { String 문자 = "😀', 'class A {\r\n// 끝\r\n}\r\n', ' '.repeat(1000)]) {
    const original = source;
    tokens(source);
    assert.equal(source, original);
  }
});
