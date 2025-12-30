import { X, Save, FileCode } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import Editor, { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { GlassPanel } from './ui/GlassPanel';

interface CodeEditorProps {
  openFiles: Array<{ path: string; name: string }>;
  activeFile: string | null;
  onFileClose: (filePath: string) => void;
  onFileSelect: (filePath: string) => void;
  onSaveReady?: (saveFunc: () => Promise<void>) => void;
  onContentChange?: (content: string) => void;
}

type SecuritySeverity = 'Low' | 'Medium' | 'High';

interface FileSecurityIssue {
  line: number;
  severity: SecuritySeverity;
  message: string;
}

interface FileSecurityScanResult {
  issues: FileSecurityIssue[];
}

export function CodeEditor({ openFiles, activeFile, onFileClose, onFileSelect, onSaveReady, onContentChange }: CodeEditorProps) {
  const [fileContents, setFileContents] = useState<Map<string, string>>(new Map());
  const [editedContents, setEditedContents] = useState<Map<string, string>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const activeFileData = openFiles.find(f => f.path === activeFile);
  const content = editedContents.has(activeFile || '')
    ? editedContents.get(activeFile || '') || ''
    : fileContents.get(activeFile || '') || '';

  const hasUnsavedChanges = activeFile && editedContents.has(activeFile);

  // Notify parent of content changes
  useEffect(() => {
    if (onContentChange) {
      onContentChange(content);
    }
  }, [content, onContentChange]);

  // Load file contents
  useEffect(() => {
    openFiles.forEach(file => {
      if (!fileContents.has(file.path)) {
        loadFileContent(file.path);
      }
    });
  }, [openFiles]);

  // Expose save function to parent
  useEffect(() => {
    if (onSaveReady) {
      onSaveReady(handleSave);
    }
  }, [activeFile, editedContents]);

  const loadFileContent = async (filePath: string) => {
    try {
      const content = await invoke<string>('read_file', { path: filePath });
      setFileContents(prev => new Map(prev).set(filePath, content));
    } catch (error) {
      console.error('Failed to load file:', error);
      setFileContents(prev => new Map(prev).set(filePath, `// Error loading file: ${error}`));
    }
  };

  const handleSave = async () => {
    if (!activeFile || !editedContents.has(activeFile)) return;

    setIsSaving(true);
    try {
      await invoke('write_file', {
        path: activeFile,
        content: editedContents.get(activeFile)
      });

      // Update the saved content
      setFileContents(prev => new Map(prev).set(activeFile, editedContents.get(activeFile)!));

      // Clear the edited content
      setEditedContents(prev => {
        const newMap = new Map(prev);
        newMap.delete(activeFile);
        return newMap;
      });

      // After a successful save, run a lightweight security scan on the active file
      await runSecurityScanForActiveFile(activeFile);
    } catch (error) {
      console.error('Failed to save file:', error);
      alert(`Failed to save file: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  const runSecurityScanForActiveFile = async (filePath: string) => {
    if (!filePath || !editorRef.current || !monacoRef.current) return;

    try {
      const result = await invoke<FileSecurityScanResult>('scan_file_for_issues', {
        path: filePath,
      });

      const model = editorRef.current.getModel();
      if (!model) return;

      const monaco = monacoRef.current;

      const markers =
        (result.issues || []).map((issue) => {
          let severity = monaco.MarkerSeverity.Info;
          if (issue.severity === 'High') {
            severity = monaco.MarkerSeverity.Error;
          } else if (issue.severity === 'Medium') {
            severity = monaco.MarkerSeverity.Warning;
          } else if (issue.severity === 'Low') {
            severity = monaco.MarkerSeverity.Info;
          }

          return {
            severity,
            message: issue.message,
            startLineNumber: issue.line,
            endLineNumber: issue.line,
            startColumn: 1,
            endColumn: 120,
          };
        }) || [];

      monaco.editor.setModelMarkers(model, 'security-scan', markers);
    } catch (error) {
      console.error('Security scan on save failed', error);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (activeFile && value !== undefined) {
      const originalContent = fileContents.get(activeFile) || '';
      if (value !== originalContent) {
        setEditedContents(prev => new Map(prev).set(activeFile, value));
      } else {
        // If content matches original, remove from edited map
        setEditedContents(prev => {
          const newMap = new Map(prev);
          newMap.delete(activeFile);
          return newMap;
        });
      }
    }
  };

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Add save command
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });

    // Focus editor
    editor.focus();
  };

  // Get language from file extension
  const getLanguage = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'json': 'json',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'py': 'python',
      'rs': 'rust',
      'go': 'go',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'h': 'cpp',
      'md': 'markdown',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'toml': 'toml',
      'sh': 'shell',
      'bash': 'shell',
      'sql': 'sql',
      'php': 'php',
      'rb': 'ruby',
      'swift': 'swift',
      'kt': 'kotlin',
      'dart': 'dart',
    };
    return languageMap[ext || ''] || 'plaintext';
  };

  return (
    <GlassPanel className="flex-1 flex flex-col h-full overflow-hidden !bg-[#1E1E1E]/80 !border-0 rounded-none">
      {/* Tabs */}
      <div className="flex bg-[#252526]/50 border-b border-white/5 items-center backdrop-blur-sm">
        <div className="flex flex-1 overflow-x-auto custom-scrollbar" style={{ scrollbarWidth: 'none' }}>
          {openFiles.map((file) => (
            <div
              key={file.path}
              className={`flex items-center gap-2 px-4 py-2 text-[13px] border-r border-white/5 cursor-pointer group flex-shrink-0 transition-colors ${activeFile === file.path
                ? 'bg-[#1E1E1E]/80 text-white border-t-2 border-t-[#00c8b4]'
                : 'text-[#969696] hover:bg-white/5'
                }`}
              onClick={() => onFileSelect(file.path)}
            >
              <span className="truncate max-w-[150px]">{file.name}</span>
              {editedContents.has(file.path) && (
                <span className="text-[#00c8b4] text-[10px]">●</span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFileClose(file.path);
                }}
                className="opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded p-0.5 transition-opacity"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        {hasUnsavedChanges && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-[13px] text-[#CCCCCC] hover:bg-[#2A2D2E] border-l border-white/5 disabled:opacity-50"
            title="Save (Ctrl+S)"
          >
            <Save size={14} className={isSaving ? 'animate-pulse' : ''} />
            <span>{isSaving ? 'Saving...' : 'Save'}</span>
          </button>
        )}
      </div>

      {/* Breadcrumbs */}
      {activeFileData && (
        <div className="flex items-center gap-2 px-4 py-1.5 text-[12px] text-[#CCCCCC] bg-black/20 border-b border-white/5">
          <span className="text-[#858585] truncate font-mono">{activeFileData.path}</span>
        </div>
      )}

      {/* Monaco Editor */}
      <div className="flex-1 overflow-hidden relative">
        {activeFileData ? (
          <Editor
            height="100%"
            language={getLanguage(activeFileData.name)}
            value={content}
            onChange={handleEditorChange}
            onMount={handleEditorDidMount}
            theme="vs-dark"
            options={{
              fontSize: 13,
              fontFamily: "'Consolas', 'Courier New', monospace",
              lineHeight: 20,
              minimap: {
                enabled: true,
                scale: 0.75,
                renderCharacters: false
              },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              insertSpaces: true,
              wordWrap: 'off',
              padding: { top: 16, bottom: 16 },
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              smoothScrolling: true,
              mouseWheelZoom: true,
              guides: {
                indentation: true,
                bracketPairs: true
              }
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-[#858585]">
            <div className="text-center p-8 rounded-xl bg-white/5 border border-white/5 backdrop-blur-sm">
              <FileCode size={48} strokeWidth={1} className="mx-auto mb-4 opacity-50" />
              <p className="text-[14px] font-medium text-[#ccc]">No file selected</p>
              <p className="text-[11px] mt-2 text-[#888]">Select a file from the Explorer to start coding</p>
            </div>
          </div>
        )}
      </div>
    </GlassPanel>
  );
}
