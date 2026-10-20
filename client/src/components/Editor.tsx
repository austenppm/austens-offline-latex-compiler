import Editor, { loader } from '@monaco-editor/react'
import { useStore } from '../stores/store'
import { useEffect, useState } from 'react'

// Configure Monaco with LaTeX syntax highlighting
function configureMonaco(monaco: typeof import('monaco-editor')) {
  // Register LaTeX language
  monaco.languages.register({ id: 'latex' })

  // Define LaTeX tokenizer
  monaco.languages.setMonarchTokensProvider('latex', {
    defaultToken: '',
    tokenPostfix: '.tex',

    brackets: [
      { open: '{', close: '}', token: 'delimiter.curly' },
      { open: '[', close: ']', token: 'delimiter.bracket' },
      { open: '(', close: ')', token: 'delimiter.parenthesis' },
    ],

    tokenizer: {
      root: [
        // Comments
        [/%.*$/, 'comment'],

        // Math mode - display
        [/\\\[/, { token: 'keyword.math', next: '@mathDisplay' }],
        [/\\\(/, { token: 'keyword.math', next: '@mathInline' }],
        [/\$\$/, { token: 'keyword.math', next: '@mathDisplayDollar' }],
        [/\$/, { token: 'keyword.math', next: '@mathInlineDollar' }],

        // Begin/End environments
        [/(\\begin)(\{)([^}]+)(\})/, ['keyword.control', 'delimiter.curly', 'variable.environment', 'delimiter.curly']],
        [/(\\end)(\{)([^}]+)(\})/, ['keyword.control', 'delimiter.curly', 'variable.environment', 'delimiter.curly']],

        // Section commands
        [/\\(section|subsection|subsubsection|paragraph|chapter|part)\b/, 'keyword.section'],

        // Common commands
        [/\\(usepackage|documentclass|input|include|bibliography|bibliographystyle)\b/, 'keyword.import'],
        [/\\(label|ref|cite|citep|citet|eqref|pageref|autoref)\b/, 'keyword.reference'],
        [/\\(textbf|textit|emph|underline|textrm|textsf|texttt|textsc)\b/, 'keyword.formatting'],
        [/\\(newcommand|renewcommand|def|let|newenvironment)\b/, 'keyword.definition'],

        // All other commands
        [/\\[a-zA-Z@]+\*?/, 'keyword.command'],
        [/\\[^a-zA-Z]/, 'keyword.command'],

        // Braces and brackets
        [/[{}]/, 'delimiter.curly'],
        [/[\[\]]/, 'delimiter.bracket'],

        // Numbers
        [/\d+/, 'number'],
      ],

      mathDisplay: [
        [/\\\]/, { token: 'keyword.math', next: '@pop' }],
        [/[^\\]+/, 'string.math'],
        [/\\[a-zA-Z]+/, 'keyword.math.command'],
        [/\\./, 'keyword.math.command'],
      ],

      mathInline: [
        [/\\\)/, { token: 'keyword.math', next: '@pop' }],
        [/[^\\]+/, 'string.math'],
        [/\\[a-zA-Z]+/, 'keyword.math.command'],
        [/\\./, 'keyword.math.command'],
      ],

      mathDisplayDollar: [
        [/\$\$/, { token: 'keyword.math', next: '@pop' }],
        [/[^$\\]+/, 'string.math'],
        [/\\[a-zA-Z]+/, 'keyword.math.command'],
        [/\\./, 'keyword.math.command'],
        [/\$/, 'string.math'],
      ],

      mathInlineDollar: [
        [/\$/, { token: 'keyword.math', next: '@pop' }],
        [/[^$\\]+/, 'string.math'],
        [/\\[a-zA-Z]+/, 'keyword.math.command'],
        [/\\./, 'keyword.math.command'],
      ],
    },
  })

  // Define Overleaf-like theme
  monaco.editor.defineTheme('latex-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
      { token: 'keyword.command', foreground: '569CD6' },
      { token: 'keyword.control', foreground: 'C586C0' },
      { token: 'keyword.section', foreground: 'DCDCAA', fontStyle: 'bold' },
      { token: 'keyword.import', foreground: 'C586C0' },
      { token: 'keyword.reference', foreground: '4EC9B0' },
      { token: 'keyword.formatting', foreground: '569CD6' },
      { token: 'keyword.definition', foreground: 'C586C0' },
      { token: 'keyword.math', foreground: '6A9955' },
      { token: 'keyword.math.command', foreground: '9CDCFE' },
      { token: 'string.math', foreground: 'CE9178' },
      { token: 'variable.environment', foreground: '4EC9B0' },
      { token: 'delimiter.curly', foreground: 'FFD700' },
      { token: 'delimiter.bracket', foreground: 'DA70D6' },
      { token: 'number', foreground: 'B5CEA8' },
    ],
    colors: {
      'editor.background': '#1e1e1e',
      'editor.foreground': '#d4d4d4',
    },
  })
}

export function CodeEditor() {
  const { content, setContent, setIsDirty, currentFile } = useStore()
  const [isMonacoReady, setIsMonacoReady] = useState(false)

  useEffect(() => {
    loader.init().then((monaco) => {
      configureMonaco(monaco)
      setIsMonacoReady(true)
    })
  }, [])

  const handleChange = (value: string | undefined) => {
    if (value !== undefined) {
      setContent(value)
      setIsDirty(true)
    }
  }

  if (!currentFile) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <p>Select a file to edit</p>
      </div>
    )
  }

  if (!isMonacoReady) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <p>Loading editor...</p>
      </div>
    )
  }

  return (
    <Editor
      height="100%"
      language="latex"
      theme="latex-dark"
      value={content}
      onChange={handleChange}
      options={{
        fontSize: 14,
        fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
        minimap: { enabled: false },
        lineNumbers: 'on',
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        renderWhitespace: 'none',
        padding: { top: 10 },
      }}
    />
  )
}
