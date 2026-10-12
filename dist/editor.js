import { Compartment, EditorSelection, EditorState, Transaction } from '@codemirror/state';
import { EditorView, drawSelection, dropCursor, highlightActiveLine, highlightActiveLineGutter, highlightSpecialChars, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentMore } from '@codemirror/commands';
import { LanguageSupport, bracketMatching, indentOnInput, indentUnit, syntaxHighlighting } from '@codemirror/language';
import { javaLanguage } from '@codemirror/lang-java';
import { highlightTree, styleTags, tagHighlighter, tags } from '@lezer/highlight';

// These are syntactic categories. No symbol resolver or Java compiler runs in the editor.
const learningJava = javaLanguage.configure({
  props: [styleTags({
    Definition: tags.definition(tags.variableName),
    Identifier: tags.variableName,
    'ClassDeclaration/Definition InterfaceDeclaration/Definition EnumDeclaration/Definition RecordDeclaration/Definition': tags.className,
    'AnnotationTypeDeclaration/Identifier': tags.className,
    'TypeParameter/Definition': tags.typeName,
    'MethodDeclaration/Definition ConstructorDeclaration/Definition': tags.function(tags.variableName),
    'MethodName/Identifier': tags.function(tags.variableName),
    'record sealed permits': tags.definitionKeyword,
  })],
});

const javaHighlighter = tagHighlighter([
  { tag: tags.keyword, class: 'tok-keyword' },
  { tag: tags.modifier, class: 'tok-keyword' },
  { tag: tags.className, class: 'tok-class' },
  { tag: tags.typeName, class: 'tok-type' },
  { tag: tags.variableName, class: 'tok-variable' },
  { tag: tags.function(tags.variableName), class: 'tok-method' },
  { tag: [tags.string, tags.character], class: 'tok-string' },
  { tag: tags.comment, class: 'tok-comment' },
  { tag: [tags.number, tags.bool, tags.null], class: 'tok-number' },
  { tag: tags.operator, class: 'tok-operator' },
  { tag: tags.punctuation, class: 'tok-punctuation' },
  { tag: tags.meta, class: 'tok-annotation' },
]);

const THEMES = new Set(['dark', 'light', 'contrast']);
function normalizeTheme(theme) { return THEMES.has(theme) ? theme : 'dark'; }
function colorMode(theme) { return EditorView.theme({}, { dark: normalizeTheme(theme) !== 'light' }); }

export function javaHighlightSpans(source) {
  const spans = [];
  highlightTree(learningJava.parser.parse(source), javaHighlighter, (from, to, classes) => spans.push({ from, to, classes }));
  return spans;
}

export function highlightJavaCode(target, source) {
  const fragment = target.ownerDocument.createDocumentFragment();
  let position = 0;
  for (const { from, to, classes } of javaHighlightSpans(source)) {
    if (from > position) fragment.append(target.ownerDocument.createTextNode(source.slice(position, from)));
    const span = target.ownerDocument.createElement('span');
    span.className = classes;
    span.textContent = source.slice(from, to);
    fragment.append(span);
    position = to;
  }
  if (position < source.length) fragment.append(target.ownerDocument.createTextNode(source.slice(position)));
  target.replaceChildren(fragment);
}

export function createJavaEditor({ parent, source, theme = 'dark', wrap = false, label, descriptionId, maxLength = 50000, onChange, onBlur, onLimit }) {
  const mode = new Compartment();
  const wrapping = new Compartment();
  let suppressChange = false;
  let destroyed = false;
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: source,
      extensions: [
        new LanguageSupport(learningJava),
        syntaxHighlighting(javaHighlighter),
        lineNumbers(), highlightActiveLineGutter(), highlightActiveLine(), highlightSpecialChars(),
        drawSelection(), dropCursor(), history(), bracketMatching(), indentOnInput(),
        EditorState.tabSize.of(4), indentUnit.of('    '),
        // Deliberately omit indentWithTab: Tab remains standard keyboard navigation.
        keymap.of([...defaultKeymap, ...historyKeymap]),
        mode.of(colorMode(theme)),
        wrapping.of(wrap ? EditorView.lineWrapping : []),
        EditorView.contentAttributes.of({
          role: 'textbox', 'aria-label': label, 'aria-multiline': 'true',
          'aria-describedby': descriptionId, 'data-testid': 'code-editor-input',
          spellcheck: 'false', autocorrect: 'off', autocapitalize: 'off', autocomplete: 'off',
        }),
        EditorState.transactionFilter.of((transaction) => {
          if (!transaction.docChanged || transaction.newDoc.length <= maxLength) return transaction;
          queueMicrotask(() => { if (!destroyed) onLimit?.(); });
          return [];
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !suppressChange) onChange?.(update.state.doc.toString());
        }),
        EditorView.domEventHandlers({ blur: () => { onBlur?.(); return false; } }),
      ],
    }),
  });
  parent.dataset.editorEngine = 'codemirror';
  return {
    getValue: () => view.state.doc.toString(),
    focus: () => view.focus(),
    selectAll: () => {
      view.dispatch({ selection: EditorSelection.single(0, view.state.doc.length) });
      view.focus();
    },
    indent: () => { indentMore(view); view.focus(); },
    setValue: (value) => {
      if (value === view.state.doc.toString()) return;
      suppressChange = true;
      try {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: value },
          selection: EditorSelection.cursor(0),
          annotations: Transaction.addToHistory.of(false),
        });
      } finally { suppressChange = false; }
    },
    setTheme: (nextTheme) => view.dispatch({ effects: mode.reconfigure(colorMode(nextTheme)) }),
    setWrap: (nextWrap) => view.dispatch({ effects: wrapping.reconfigure(nextWrap ? EditorView.lineWrapping : []) }),
    destroy: () => { destroyed = true; view.destroy(); },
  };
}
