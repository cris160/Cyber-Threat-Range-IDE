import { useState, useEffect } from 'react';
import { ActivityBar } from './components/ActivityBar';
import { FileExplorer } from './components/FileExplorer';
import { CodeEditor } from './components/CodeEditor';
import { RealTerminal as Terminal } from './components/RealTerminal';
import { InteractiveCodeRunner as CodeRunner } from './components/InteractiveCodeRunner';
import { StatusBar } from './components/StatusBar';
import { MenuBar } from './components/MenuBar';
import { AIChatbot } from './components/AIChatbot';
import { GitPanel } from './components/GitPanel';
import { SecurityPanel } from './components/SecurityPanel';

import { DebugPanel } from './components/DebugPanel';
import { NewFileDialog } from './components/dialogs/NewFileDialog';
import { NewFolderDialog } from './components/dialogs/NewFolderDialog';
import { AboutDialog } from './components/dialogs/AboutDialog';
import { MatrixRain } from './components/MatrixRain';
import { ExploitPanel } from './components/ExploitPanel';
import { SecurityDashboard } from './components/SecurityDashboard';
import { ExtensionsPanel } from './components/ExtensionsPanel';
import { SearchPanel } from './components/SearchPanel';
import { SecurityToolsPanel } from './components/SecurityToolsPanel';
import { ExploitProverPanel } from './components/ExploitProverPanel';
import { useSecurity } from './contexts/SecurityContext';

interface OpenFile {
  path: string;
  name: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('explorer');
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isTerminalExpanded, setIsTerminalExpanded] = useState(true);
  const [explorerWidth, setExplorerWidth] = useState(350);
  const [terminalHeight, setTerminalHeight] = useState(256);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [chatbotWidth, setChatbotWidth] = useState(256);
  const [isNewFileDialogOpen, setIsNewFileDialogOpen] = useState(false);
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);
  const [showCodeRunner, setShowCodeRunner] = useState(false);
  const [codeRunnerWidth, setCodeRunnerWidth] = useState(400);
  const [workspaceFolder, setWorkspaceFolder] = useState<string | null>(null);
  const [terminalCommand, setTerminalCommand] = useState<string | null>(null);
  const [saveFileCallback, setSaveFileCallback] = useState<(() => Promise<void>) | null>(null);
  const [activeFileContent, setActiveFileContent] = useState<string>('');


  const { setWorkspacePath } = useSecurity();

  // Sync workspace folder with SecurityContext
  useEffect(() => {
    setWorkspacePath(workspaceFolder);
  }, [workspaceFolder, setWorkspacePath]);

  const handleOpenFolder = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Open Folder'
      });

      if (selected && typeof selected === 'string') {
        setWorkspaceFolder(selected);
      }
    } catch (error) {
      console.error('Failed to open folder:', error);
    }
  };

  const handleOpenFile = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        multiple: false,
        title: 'Open File'
      });

      if (selected && typeof selected === 'string') {
        const fileName = selected.split(/[/\\]/).pop() || selected;
        handleFileClick(selected, fileName);
      }
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  };

  const handleFileClick = (filePath: string, fileName: string) => {
    setSelectedFile(filePath);

    // Open file if not already open
    if (!openFiles.some(f => f.path === filePath)) {
      setOpenFiles([...openFiles, { path: filePath, name: fileName }]);
    }

    // Set as active file
    setActiveFile(filePath);
  };

  const handleFileClose = () => {
    if (activeFile) {
      const newOpenFiles = openFiles.filter((f) => f.path !== activeFile);
      setOpenFiles(newOpenFiles);

      // Switch to another open file
      if (newOpenFiles.length > 0) {
        setActiveFile(newOpenFiles[newOpenFiles.length - 1].path);
      } else {
        setActiveFile(null);
      }
    }
  };

  const handleRunInTerminal = (command: string) => {
    setTerminalCommand(command);
    setIsTerminalExpanded(true);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#1E1E1E] text-white overflow-hidden relative">
      {/* Matrix Rain Background */}
      <MatrixRain />

      {/* Menu Bar */}
      <MenuBar
        onNewFile={() => setIsNewFileDialogOpen(true)}
        onNewFolder={() => setIsNewFolderDialogOpen(true)}
        onOpenFile={handleOpenFile}
        onOpenFolder={handleOpenFolder}
        onCloseFile={handleFileClose}
        onToggleTerminal={() => setIsTerminalExpanded(!isTerminalExpanded)}
        onShowAbout={() => setIsAboutDialogOpen(true)}
        onRunCode={() => setShowCodeRunner(!showCodeRunner)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative z-0">
        {/* Activity Bar */}
        <ActivityBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isChatbotOpen={isChatbotOpen}
          onChatbotToggle={() => setIsChatbotOpen(!isChatbotOpen)}
        />

        {/* AI Chatbot - slides in from left */}
        <div
          className="transition-all duration-300 ease-in-out overflow-hidden" style={{
            width: isChatbotOpen ? `${chatbotWidth}px` : '0px',
            opacity: isChatbotOpen ? 1 : 0
          }}
        >
          <AIChatbot
            width={chatbotWidth}
            onWidthChange={setChatbotWidth}
          />
        </div>

        {/* Sidebar - shifts right when chatbot opens */}
        <div className="transition-all duration-300 ease-in-out">
          {activeTab === 'explorer' && (
            <FileExplorer
              onFileClick={handleFileClick}
              selectedFile={selectedFile}
              width={explorerWidth}
              onWidthChange={setExplorerWidth}
              workspaceFolder={workspaceFolder}
              onOpenFolder={handleOpenFolder}
            />
          )}
          {activeTab === 'search' && (
            <SearchPanel
              width={explorerWidth}
              onWidthChange={setExplorerWidth}
              workspaceFolder={workspaceFolder}
              onFileOpen={(path, line) => {
                handleFileClick(path, path.split(/[/\\]/).pop() || path);
                // TODO: Navigate to line
              }}
            />
          )}
          {activeTab === 'dashboard' && (
            <SecurityDashboard />
          )}
          {activeTab === 'debug' && (
            <DebugPanel
              activeFile={activeFile}
              width={explorerWidth}
            />
          )}
          {activeTab === 'source-control' && (
            <div style={{ width: `${explorerWidth}px` }} className="h-full">
              <GitPanel currentPath={workspaceFolder} />
            </div>
          )}
          {activeTab === 'security' && (
            <SecurityPanel
              workspaceFolder={workspaceFolder}
              activeFile={activeFile}
              width={explorerWidth}
              onWidthChange={setExplorerWidth}
            />
          )}

          {activeTab === 'exploit' && (
            <ExploitPanel activeFile={activeFile} />
          )}
          {activeTab === 'security-tools' && (
            <SecurityToolsPanel
              width={explorerWidth}
              onRunInTerminal={(cmd) => {
                setTerminalCommand(cmd);
                setIsTerminalExpanded(true);
              }}
            />
          )}
          {activeTab === 'extensions' && (
            <ExtensionsPanel width={explorerWidth} onWidthChange={setExplorerWidth} />
          )}
          {activeTab === 'exploit-prover' && (
            <ExploitProverPanel
              width={explorerWidth}
              activeFile={activeFile}
              fileContent={activeFileContent}
              workspacePath={workspaceFolder || undefined}
            />
          )}
        </div>

        {/* Main Editor & Code Runner */}
        <div className="flex-1 flex overflow-hidden">
          {/* Editor Area */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col relative z-0">
              <CodeEditor
                openFiles={openFiles}
                activeFile={activeFile}
                onContentChange={setActiveFileContent}
                onFileClose={(path) => {
                  const newOpenFiles = openFiles.filter((f) => f.path !== path);
                  setOpenFiles(newOpenFiles);
                  if (path === activeFile) {
                    if (newOpenFiles.length > 0) {
                      setActiveFile(newOpenFiles[newOpenFiles.length - 1].path);
                    } else {
                      setActiveFile(null);
                    }
                  }
                }}
                onFileSelect={setActiveFile}
                onSaveReady={(saveFunc) => setSaveFileCallback(() => saveFunc)}
              />
            </div>

            {/* Terminal */}
            <div className="flex-none relative z-50">
              <Terminal
                isExpanded={isTerminalExpanded}
                onToggle={() => setIsTerminalExpanded(!isTerminalExpanded)}
                height={terminalHeight}
                onHeightChange={setTerminalHeight}
                externalCommand={terminalCommand}
                onCommandExecuted={() => setTerminalCommand(null)}
                workspaceFolder={workspaceFolder}
              />
            </div>
          </div>

          {/* Code Runner Panel - slides in from right */}
          <div
            className="transition-all duration-300 ease-in-out overflow-hidden border-l border-[#2D2D30]"
            style={{
              width: showCodeRunner ? `${codeRunnerWidth}px` : '0px',
              opacity: showCodeRunner ? 1 : 0
            }}
          >
            {showCodeRunner && (
              <CodeRunner
                filePath={activeFile}
                onRunInTerminal={handleRunInTerminal}
                onSaveFile={saveFileCallback}
              />
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar onRunCode={() => setShowCodeRunner(!showCodeRunner)} />

      {/* Dialogs */}
      <NewFileDialog
        isOpen={isNewFileDialogOpen}
        onClose={() => setIsNewFileDialogOpen(false)}
        currentPath={workspaceFolder || ''}
        onSuccess={() => { }}
      />

      <NewFolderDialog
        isOpen={isNewFolderDialogOpen}
        onClose={() => setIsNewFolderDialogOpen(false)}
        currentPath={workspaceFolder || ''}
        onSuccess={() => { }}
      />

      <AboutDialog
        isOpen={isAboutDialogOpen}
        onClose={() => setIsAboutDialogOpen(false)}
      />
    </div>
  );
}
