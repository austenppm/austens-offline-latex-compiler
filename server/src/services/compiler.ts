import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

export type LatexEngine = 'pdflatex' | 'lualatex' | 'xelatex' | 'platex' | 'uplatex'

export interface CompileError {
  line: number
  message: string
  file?: string
}

export interface CompileResult {
  success: boolean
  errors: CompileError[]
  log: string
}

function parseLatexLog(log: string, mainFile: string): CompileError[] {
  const errors: CompileError[] = []
  const lines = log.split('\n')

  // Common LaTeX error patterns
  const errorPatterns = [
    // Standard LaTeX error: ! Error message
    /^!\s+(.+)$/,
    // Line number: l.123 ...
    /^l\.(\d+)\s+(.*)$/,
    // File and line: ./file.tex:123: error
    /^\.\/(.+):(\d+):\s*(.+)$/,
  ]

  let currentError: Partial<CompileError> | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Check for ! error marker
    const errorMatch = line.match(/^!\s+(.+)$/)
    if (errorMatch) {
      if (currentError && currentError.message) {
        errors.push({
          line: currentError.line || 1,
          message: currentError.message,
          file: currentError.file,
        })
      }
      currentError = { message: errorMatch[1] }
      continue
    }

    // Check for line number
    const lineMatch = line.match(/^l\.(\d+)\s*(.*)$/)
    if (lineMatch && currentError) {
      currentError.line = parseInt(lineMatch[1], 10)
      if (lineMatch[2]) {
        currentError.message = `${currentError.message}: ${lineMatch[2]}`
      }
      errors.push({
        line: currentError.line,
        message: currentError.message || 'Unknown error',
        file: currentError.file || mainFile,
      })
      currentError = null
      continue
    }

    // Check for file:line:message format
    const fileLineMatch = line.match(/^\.\/(.+):(\d+):\s*(.+)$/)
    if (fileLineMatch) {
      errors.push({
        file: fileLineMatch[1],
        line: parseInt(fileLineMatch[2], 10),
        message: fileLineMatch[3],
      })
    }
  }

  // Handle any remaining error
  if (currentError && currentError.message) {
    errors.push({
      line: currentError.line || 1,
      message: currentError.message,
      file: currentError.file,
    })
  }

  return errors
}

// Get platform-specific paths for TeX binaries
function getTexPaths(): { additionalPath: string; isWindows: boolean; isMac: boolean } {
  const isWindows = process.platform === 'win32'
  const isMac = process.platform === 'darwin'
  let additionalPath = ''

  if (isWindows) {
    const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files'
    additionalPath = `${programFiles}\\MiKTeX\\miktex\\bin\\x64;C:\\texlive\\2025\\bin\\windows;C:\\texlive\\2024\\bin\\windows`
  } else if (isMac) {
    additionalPath = '/usr/local/texlive/2025/bin/universal-darwin:/usr/local/texlive/2024/bin/universal-darwin:/Library/TeX/texbin'
  } else {
    additionalPath = '/usr/local/texlive/2025/bin/x86_64-linux:/usr/local/texlive/2024/bin/x86_64-linux'
  }

  return { additionalPath, isWindows, isMac }
}

// Find executable path for a given command
function findExecutable(command: string, isWindows: boolean, isMac: boolean): string {
  const ext = isWindows ? '.exe' : ''

  let paths: string[] = []

  if (isWindows) {
    const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files'
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'
    const localAppData = process.env['LOCALAPPDATA'] || ''

    paths = [
      command,
      `${programFiles}\\MiKTeX\\miktex\\bin\\x64\\${command}${ext}`,
      `${programFilesX86}\\MiKTeX\\miktex\\bin\\x64\\${command}${ext}`,
      `${localAppData}\\Programs\\MiKTeX\\miktex\\bin\\x64\\${command}${ext}`,
      `C:\\texlive\\2025\\bin\\windows\\${command}${ext}`,
      `C:\\texlive\\2024\\bin\\windows\\${command}${ext}`,
      `C:\\texlive\\2023\\bin\\windows\\${command}${ext}`,
    ]
  } else if (isMac) {
    paths = [
      command,
      `/usr/local/texlive/2025/bin/universal-darwin/${command}`,
      `/usr/local/texlive/2024/bin/universal-darwin/${command}`,
      `/usr/local/texlive/2023/bin/universal-darwin/${command}`,
      `/Library/TeX/texbin/${command}`,
    ]
  } else {
    paths = [
      command,
      `/usr/local/texlive/2025/bin/x86_64-linux/${command}`,
      `/usr/local/texlive/2024/bin/x86_64-linux/${command}`,
      `/usr/bin/${command}`,
    ]
  }

  for (const p of paths) {
    if (p === command || fs.existsSync(p)) {
      return p
    }
  }

  return command
}

// Run a single command and return the output
function runCommand(
  cmd: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
  isWindows: boolean
): Promise<{ code: number | null; log: string }> {
  return new Promise((resolve) => {
    let log = ''

    const proc = spawn(cmd, args, {
      cwd,
      env,
      shell: isWindows,
    })

    proc.stdout.on('data', (data) => {
      log += data.toString()
    })

    proc.stderr.on('data', (data) => {
      log += data.toString()
    })

    proc.on('error', (err) => {
      log += `\nError: ${err.message}`
      resolve({ code: -1, log })
    })

    proc.on('close', (code) => {
      resolve({ code, log })
    })
  })
}

// Check if the document uses bibliography
function needsBibtex(workspacePath: string, mainFile: string): boolean {
  const mainFilePath = path.join(workspacePath, mainFile)
  try {
    const content = fs.readFileSync(mainFilePath, 'utf-8')
    // Check for bibliography commands
    if (content.includes('\\bibliography{') ||
        content.includes('\\addbibresource{') ||
        content.includes('\\cite{') ||
        content.includes('\\citep{') ||
        content.includes('\\citet{')) {
      return true
    }
    // Check for .bib files in the workspace
    const files = fs.readdirSync(workspacePath)
    return files.some(f => f.endsWith('.bib'))
  } catch {
    return false
  }
}

// Check if biber should be used instead of bibtex (for biblatex with biber backend)
function needsBiber(workspacePath: string, mainFile: string): boolean {
  const mainFilePath = path.join(workspacePath, mainFile)
  try {
    const content = fs.readFileSync(mainFilePath, 'utf-8')
    // biblatex with biber backend
    return content.includes('\\usepackage') &&
           content.includes('biblatex') &&
           (content.includes('backend=biber') || content.includes('\\addbibresource{'))
  } catch {
    return false
  }
}

// Check if Japanese bibliography style is used (junsrt, jplain, jalpha, jabbrev, etc.)
function usesJapaneseBibStyle(workspacePath: string, mainFile: string): boolean {
  const mainFilePath = path.join(workspacePath, mainFile)
  try {
    const content = fs.readFileSync(mainFilePath, 'utf-8')
    // Check for Japanese bibliography styles
    const japaneseStyles = ['junsrt', 'jplain', 'jalpha', 'jabbrev', 'jipsj', 'jname', 'tieice', 'tipsj']
    return japaneseStyles.some(style => content.includes(`\\bibliographystyle{${style}`))
  } catch {
    return false
  }
}

export async function compileLatex(
  workspacePath: string,
  mainFile: string = 'main.tex',
  engine: LatexEngine = 'pdflatex'
): Promise<CompileResult> {
  const mainFilePath = path.join(workspacePath, mainFile)

  if (!fs.existsSync(mainFilePath)) {
    return {
      success: false,
      errors: [{ line: 1, message: `Main file not found: ${mainFile}` }],
      log: `Error: ${mainFile} does not exist`,
    }
  }

  const { additionalPath, isWindows, isMac } = getTexPaths()
  const pathSeparator = isWindows ? ';' : ':'
  const newPath = additionalPath
    ? `${process.env.PATH}${pathSeparator}${additionalPath}`
    : process.env.PATH

  const env = {
    ...process.env,
    PATH: newPath,
  }

  const engineCmd = findExecutable(engine, isWindows, isMac)
  const baseFileName = mainFile.replace('.tex', '')

  // Japanese engines (platex, uplatex) produce DVI, need dvipdfmx to convert to PDF
  const needsDvipdfmx = engine === 'platex' || engine === 'uplatex'

  // Check if we need to run bibtex/biber
  const hasBibliography = needsBibtex(workspacePath, mainFile)
  const useBiber = needsBiber(workspacePath, mainFile)
  const useJapaneseBib = usesJapaneseBibStyle(workspacePath, mainFile)

  let log = ''

  // Common LaTeX arguments
  const latexArgs = [
    '-interaction=nonstopmode',
    '-halt-on-error',
    '-file-line-error',
    mainFile,
  ]

  // Helper function to run LaTeX and check for errors
  const runLatex = async (passName: string): Promise<{ success: boolean; log: string }> => {
    log += `\n--- ${passName} ---\n`
    const result = await runCommand(engineCmd, latexArgs, workspacePath, env, isWindows)
    log += result.log

    if (result.code !== 0 && result.code !== null) {
      // Check for specific engine not found error
      if (result.log.includes('Error: spawn') || result.log.includes('ENOENT')) {
        return { success: false, log }
      }
      // For non-fatal errors in intermediate passes, continue
      return { success: false, log }
    }
    return { success: true, log }
  }

  // Step 1: First LaTeX pass
  const firstPass = await runLatex('LaTeX Pass 1')

  // Check for fatal errors (command not found)
  if (log.includes('Error: spawn') || log.includes('ENOENT')) {
    let installHint = 'Is a LaTeX distribution installed?'
    if (isWindows) {
      installHint = 'Please install MiKTeX (https://miktex.org/) or TeX Live (https://tug.org/texlive/)'
    } else if (isMac) {
      installHint = 'Please install MacTeX: brew install --cask mactex'
    } else {
      installHint = 'Please install TeX Live: sudo apt install texlive-full (Debian/Ubuntu) or equivalent'
    }

    return {
      success: false,
      errors: [{
        line: 1,
        message: `Failed to run ${engine}: ${installHint}`,
      }],
      log,
    }
  }

  // Step 2: Run BibTeX/Biber if needed
  if (hasBibliography) {
    const auxPath = path.join(workspacePath, `${baseFileName}.aux`)

    if (fs.existsSync(auxPath)) {
      if (useBiber) {
        // Use biber for biblatex
        log += '\n--- Running Biber ---\n'
        const biberCmd = findExecutable('biber', isWindows, isMac)
        const biberResult = await runCommand(biberCmd, [baseFileName], workspacePath, env, isWindows)
        log += biberResult.log
      } else {
        // Use pbibtex for Japanese styles or Japanese engines, otherwise bibtex
        const useJapaneseEngine = engine === 'platex' || engine === 'uplatex'
        const bibtexCommand = (useJapaneseEngine || useJapaneseBib) ? 'pbibtex' : 'bibtex'
        log += `\n--- Running ${bibtexCommand} ---\n`
        const bibtexCmd = findExecutable(bibtexCommand, isWindows, isMac)

        // For pbibtex, we need to set BSTINPUTS to include the pbibtex/bst directory
        let bibtexEnv = env
        if (bibtexCommand === 'pbibtex') {
          const pbibtexBstPaths = [
            '/usr/local/texlive/2025/texmf-dist/pbibtex/bst',
            '/usr/local/texlive/2024/texmf-dist/pbibtex/bst',
            '/usr/local/texlive/2023/texmf-dist/pbibtex/bst',
          ].filter(p => fs.existsSync(p))

          if (pbibtexBstPaths.length > 0) {
            const existingBstInputs = process.env.BSTINPUTS || ''
            bibtexEnv = {
              ...env,
              BSTINPUTS: `${pbibtexBstPaths.join(':')}:${existingBstInputs}`,
            }
          }
        }

        const bibtexResult = await runCommand(bibtexCmd, [baseFileName], workspacePath, bibtexEnv, isWindows)
        log += bibtexResult.log

        // If pbibtex fails, try regular bibtex as fallback (but this likely won't help for Japanese styles)
        if (bibtexResult.code !== 0 && bibtexCommand === 'pbibtex') {
          log += '\n--- pbibtex failed, trying bibtex ---\n'
          const fallbackCmd = findExecutable('bibtex', isWindows, isMac)
          const fallbackResult = await runCommand(fallbackCmd, [baseFileName], workspacePath, env, isWindows)
          log += fallbackResult.log
        }
      }

      // Step 3: Second LaTeX pass (to incorporate bibliography)
      await runLatex('LaTeX Pass 2')

      // Step 4: Third LaTeX pass (to resolve cross-references)
      await runLatex('LaTeX Pass 3')
    }
  } else {
    // Even without bibliography, run a second pass to resolve cross-references
    // Check if there are unresolved references
    if (log.includes('Rerun to get') || log.includes('undefined references')) {
      await runLatex('LaTeX Pass 2')
    }
  }

  // Step 5: For Japanese engines, convert DVI to PDF using dvipdfmx
  if (needsDvipdfmx) {
    const dviPath = path.join(workspacePath, `${baseFileName}.dvi`)

    if (!fs.existsSync(dviPath)) {
      return {
        success: false,
        errors: [{ line: 1, message: `DVI file not generated. ${engine} may have failed.` }],
        log,
      }
    }

    log += '\n\n--- Running dvipdfmx ---\n'

    const dvipdfmxCmd = findExecutable('dvipdfmx', isWindows, isMac)
    const dvipdfmxResult = await runCommand(
      dvipdfmxCmd,
      [`${baseFileName}.dvi`],
      workspacePath,
      env,
      isWindows
    )

    log += dvipdfmxResult.log

    if (dvipdfmxResult.code !== 0 && dvipdfmxResult.code !== null) {
      return {
        success: false,
        errors: [{ line: 1, message: 'dvipdfmx failed to convert DVI to PDF' }],
        log,
      }
    }
  }

  // Check if PDF was generated
  const pdfPath = path.join(workspacePath, `${baseFileName}.pdf`)
  const success = fs.existsSync(pdfPath)
  const errors = success ? [] : parseLatexLog(log, mainFile)

  return {
    success,
    errors: errors.length > 0 ? errors : (success ? [] : [{ line: 1, message: 'PDF was not generated' }]),
    log,
  }
}
