import { ChevronRight, ChevronDown, Folder, FileCode, FileText, MoreVertical, FilePlus, FolderPlus, RefreshCw, FolderTree, FolderOpen, Trash2, Edit } from 'lucide-react';
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { NewFileDialog, NewFolderDialog, DeleteDialog, RenameDialog } from './dialogs';
import { GlassPanel } from './ui/GlassPanel';
import { PanelHeader } from './ui/PanelComponents';
import { ResizeHandle } from './ResizeHandle';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  extension?: string;
  children?: FileNode[];
}

interface FileTreeItemProps {
  node: FileNode;
  level: number;
  onFileClick: (filePath: string, fileName: string) => void;
  selectedFile: string | null;
  onToggle: (path: string) => void;
  expandedFolders: Set<string>;
  onContextMenu: (node: FileNode, e: React.MouseEvent) => void;
}

function FileTreeItem({ node, level, onFileClick, selectedFile, onToggle, expandedFolders, onContextMenu }: FileTreeItemProps) {
  const isExpanded = expandedFolders.has(node.path);
  const [children, setChildren] = useState<FileNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isExpanded && node.type === 'folder' && children.length === 0) {
      loadChildren();
    }
  }, [isExpanded]);

  const loadChildren = async () => {
    setIsLoading(true);
    try {
      const result = await invoke<FileNode[]>('list_directory', { path: node.path });
      setChildren(result);
    } catch (error) {
      console.error('Failed to load directory:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFileIcon = (extension?: string) => {
    if (!extension) return <FileText size={16} className="text-[#858585]" />;

    switch (extension.toLowerCase()) {
      case 'js':
      case 'jsx':
        return <div className="w-4 h-4 flex items-center justify-center text-[10px] text-[#F0DB4F] bg-[#2D2D30] rounded">JS</div>;
      case 'ts':
      case 'tsx':
        return <div className="w-4 h-4 flex items-center justify-center text-[10px] text-[#3178C6] bg-[#2D2D30] rounded">TS</div>;
      case 'css':
        return <div className="w-4 h-4 flex items-center justify-center text-[10px] text-[#2196F3] bg-[#2D2D30] rounded">CSS</div>;
      case 'json':
        return <div className="w-4 h-4 flex items-center justify-center text-[10px] text-[#5CB85C] bg-[#2D2D30] rounded">{'{}'}</div>;
      case 'html':
        return <div className="w-4 h-4 flex items-center justify-center text-[10px] text-[#E44D26] bg-[#2D2D30] rounded">HTML</div>;
      case 'md':
        return <div className="w-4 h-4 flex items-center justify-center text-[10px] text-white bg-[#2D2D30] rounded">MD</div>;
      case 'rs':
        return <div className="w-4 h-4 flex items-center justify-center text-[10px] text-[#CE422B] bg-[#2D2D30] rounded">RS</div>;
      case 'py':
        return <div className="w-4 h-4 flex items-center justify-center text-[10px] text-[#3776AB] bg-[#2D2D30] rounded">PY</div>;
      case 'go':
        return <div className="w-4 h-4 flex items-center justify-center text-[10px] text-[#00ADD8] bg-[#2D2D30] rounded">GO</div>;
      default:
        return <FileText size={16} className="text-[#858585]" />;
    }
  };

  if (node.type === 'folder') {
    return (
      <div>
        <button
          onClick={() => onToggle(node.path)}
          onContextMenu={(e) => onContextMenu(node, e)}
          className="w-full flex items-center gap-1 px-2 py-0.5 hover:bg-[#2A2D2E] text-left text-[13px] text-[#CCCCCC]"
          style={{ paddingLeft: `${level * 12 + 8}px` }}
        >
          {isExpanded ? (
            <ChevronDown size={16} className="text-[#CCCCCC] flex-shrink-0" />
          ) : (
            <ChevronRight size={16} className="text-[#CCCCCC] flex-shrink-0" />
          )}
          {isExpanded ? (
            <FolderOpen size={16} className="text-[#DCAD60] flex-shrink-0" />
          ) : (
            <Folder size={16} className="text-[#DCAD60] flex-shrink-0" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {isExpanded && (
          <div>
            {isLoading ? (
              <div className="text-[11px] text-[#858585] px-2 py-1" style={{ paddingLeft: `${(level + 1) * 12 + 8}px` }}>
                Loading...
              </div>
            ) : (
              children.map((child) => (
                <FileTreeItem
                  key={child.path}
                  node={child}
                  level={level + 1}
                  onFileClick={onFileClick}
                  selectedFile={selectedFile}
                  onToggle={onToggle}
                  expandedFolders={expandedFolders}
                  onContextMenu={onContextMenu}
                />
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  const isSelected = selectedFile === node.path;

  return (
    <button
      onClick={() => onFileClick(node.path, node.name)}
      onContextMenu={(e) => onContextMenu(node, e)}
      className={`w-full flex items-center gap-2 px-2 py-0.5 text-left text-[13px] transition-colors ${isSelected
          ? 'bg-[#37373D] text-white'
          : 'text-[#CCCCCC] hover:bg-[#2A2D2E]'
        }`}
      style={{ paddingLeft: `${level * 12 + 24}px` }}
    >
      {getFileIcon(node.extension)}
      <span className="truncate">{node.name}</span>
    </button>
  );
}

interface FileExplorerProps {
  onFileClick: (filePath: string, fileName: string) => void;
  selectedFile: string | null;
  width: number;
  onWidthChange: (width: number) => void;
  workspaceFolder: string | null;
  onOpenFolder: () => void;
}

interface ContextMenu {
  node: FileNode;
  x: number;
  y: number;
}

export function FileExplorer({ onFileClick, selectedFile, width, onWidthChange, workspaceFolder, onOpenFolder }: FileExplorerProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [rootPath, setRootPath] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Dialog states
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [selectedNode, setSelectedNode] = useState<FileNode | null>(null);
  const [targetPath, setTargetPath] = useState<string>('');

  useEffect(() => {
    if (workspaceFolder) {
      loadDirectory(workspaceFolder);
    } else {
      loadRootDirectory();
    }
  }, [workspaceFolder]);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  const loadRootDirectory = async () => {
    try {
      const homeDir = await invoke<string>('get_home_directory');
      setRootPath(homeDir);
      setTargetPath(homeDir);
      const files = await invoke<FileNode[]>('list_directory', { path: homeDir });
      setFileTree(files);
    } catch (error) {
      console.error('Failed to load home directory:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDirectory = async (path: string) => {
    setIsLoading(true);
    try {
      setRootPath(path);
      setTargetPath(path);
      const files = await invoke<FileNode[]>('list_directory', { path });
      setFileTree(files);
    } catch (error) {
      console.error('Failed to load directory:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResize = (delta: number) => {
    if (onWidthChange) {
      const newWidth = width + delta;
      if (newWidth >= 200 && newWidth <= 600) {
        onWidthChange(newWidth);
      }
    }
  };

  const handleToggle = (path: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const handleContextMenu = (node: FileNode, e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ node, x: e.clientX, y: e.clientY });
  };

  const handleNewFile = () => {
    if (contextMenu) {
      const basePath = contextMenu.node.type === 'folder' ? contextMenu.node.path : rootPath || '';
      setTargetPath(basePath);
      setShowNewFileDialog(true);
      setContextMenu(null);
    }
  };

  const handleNewFolder = () => {
    if (contextMenu) {
      const basePath = contextMenu.node.type === 'folder' ? contextMenu.node.path : rootPath || '';
      setTargetPath(basePath);
      setShowNewFolderDialog(true);
      setContextMenu(null);
    }
  };

  const handleDelete = () => {
    if (contextMenu) {
      setSelectedNode(contextMenu.node);
      setShowDeleteDialog(true);
      setContextMenu(null);
    }
  };

  const handleRename = () => {
    if (contextMenu) {
      setSelectedNode(contextMenu.node);
      setShowRenameDialog(true);
      setContextMenu(null);
    }
  };

  const handleRefresh = async () => {
    if (rootPath) {
      setIsLoading(true);
      try {
        const files = await invoke<FileNode[]>('list_directory', { path: rootPath });
        setFileTree(files);
        setExpandedFolders(new Set());
      } catch (error) {
        console.error('Failed to refresh directory:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const MenuActions = (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="p-1 rounded hover:bg-white/10 opacity-60 hover:opacity-100 transition-opacity"
      >
        <MoreVertical size={14} />
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 top-6 z-20 w-56 bg-[#3C3C3C] border border-[#454545] rounded shadow-lg py-1 text-[13px] normal-case">
            <button
              onClick={() => {
                onOpenFolder();
                setShowMenu(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-1.5 hover:bg-[#2A2D2E] text-left text-[#CCCCCC]"
            >
              <FolderOpen size={14} />
              <span>Open Folder...</span>
            </button>
            <div className="border-t border-[#454545] my-1" />
            <button
              onClick={() => {
                setTargetPath(rootPath || '');
                setShowNewFileDialog(true);
                setShowMenu(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-1.5 hover:bg-[#2A2D2E] text-left text-[#CCCCCC]"
            >
              <FilePlus size={14} />
              <span>New File...</span>
            </button>
            <button
              onClick={() => {
                setTargetPath(rootPath || '');
                setShowNewFolderDialog(true);
                setShowMenu(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-1.5 hover:bg-[#2A2D2E] text-left text-[#CCCCCC]"
            >
              <FolderPlus size={14} />
              <span>New Folder...</span>
            </button>
            <div className="border-t border-[#454545] my-1" />
            <button
              onClick={() => {
                handleRefresh();
                setShowMenu(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-1.5 hover:bg-[#2A2D2E] text-left text-[#CCCCCC]"
            >
              <RefreshCw size={14} />
              <span>Refresh Explorer</span>
            </button>
            <button
              onClick={() => {
                setExpandedFolders(new Set());
                setShowMenu(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-1.5 hover:bg-[#2A2D2E] text-left text-[#CCCCCC]"
            >
              <FolderTree size={14} />
              <span>Collapse Folders in Explorer</span>
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      <GlassPanel width={width}>
        {/* Header */}
        <PanelHeader
          title={workspaceFolder ? workspaceFolder.split(/[/\\]/).pop() || 'Explorer' : 'Explorer'}
          icon={<Folder size={14} />}
          iconColor="#DCAD60"
          actions={MenuActions}
        />

        <div className="px-3 py-1 text-[11px] text-[#858585] border-b border-white/5 truncate bg-black/10">
          {rootPath || 'No folder open'}
        </div>

        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#424242 transparent' }}>
          {!workspaceFolder ? (
            <div className="flex flex-col items-center justify-center h-full text-[#858585] text-[12px] p-4 text-center">
              <FolderOpen size={48} className="mb-4 opacity-50" />
              <p className="mb-2">No folder opened</p>
              <button
                onClick={onOpenFolder}
                className="mt-2 px-4 py-2 bg-[#0E639C] hover:bg-[#1177BB] text-white rounded text-[13px] transition-colors"
              >
                Open Folder
              </button>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center h-32 text-[#858585] text-[12px]">
              <div className="flex items-center gap-2">
                <RefreshCw size={14} className="animate-spin" />
                <span>Loading...</span>
              </div>
            </div>
          ) : fileTree.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-[#858585] text-[12px]">
              Empty directory
            </div>
          ) : (
            fileTree.map((node) => (
              <FileTreeItem
                key={node.path}
                node={node}
                level={0}
                onFileClick={onFileClick}
                selectedFile={selectedFile}
                onToggle={handleToggle}
                expandedFolders={expandedFolders}
                onContextMenu={handleContextMenu}
              />
            ))
          )}
        </div>

        <ResizeHandle direction="horizontal" onResize={handleResize} />
      </GlassPanel>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-30 w-56 bg-[#3C3C3C] border border-[#454545] rounded shadow-lg py-1 text-[13px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={handleNewFile}
            className="w-full flex items-center gap-3 px-3 py-1.5 hover:bg-[#2A2D2E] text-left text-[#CCCCCC]"
          >
            <FilePlus size={14} />
            <span>New File...</span>
          </button>
          <button
            onClick={handleNewFolder}
            className="w-full flex items-center gap-3 px-3 py-1.5 hover:bg-[#2A2D2E] text-left text-[#CCCCCC]"
          >
            <FolderPlus size={14} />
            <span>New Folder...</span>
          </button>
          <div className="border-t border-[#454545] my-1" />
          <button
            onClick={handleRename}
            className="w-full flex items-center gap-3 px-3 py-1.5 hover:bg-[#2A2D2E] text-left text-[#CCCCCC]"
          >
            <Edit size={14} />
            <span>Rename...</span>
          </button>
          <button
            onClick={handleDelete}
            className="w-full flex items-center gap-3 px-3 py-1.5 hover:bg-[#2A2D2E] text-left text-red-400"
          >
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
        </div>
      )}

      {/* Dialogs */}
      <NewFileDialog
        isOpen={showNewFileDialog}
        onClose={() => setShowNewFileDialog(false)}
        currentPath={targetPath}
        onSuccess={handleRefresh}
      />

      <NewFolderDialog
        isOpen={showNewFolderDialog}
        onClose={() => setShowNewFolderDialog(false)}
        currentPath={targetPath}
        onSuccess={handleRefresh}
      />

      {selectedNode && (
        <>
          <DeleteDialog
            isOpen={showDeleteDialog}
            onClose={() => {
              setShowDeleteDialog(false);
              setSelectedNode(null);
            }}
            itemPath={selectedNode.path}
            itemName={selectedNode.name}
            itemType={selectedNode.type}
            onSuccess={handleRefresh}
          />

          <RenameDialog
            isOpen={showRenameDialog}
            onClose={() => {
              setShowRenameDialog(false);
              setSelectedNode(null);
            }}
            itemPath={selectedNode.path}
            itemName={selectedNode.name}
            itemType={selectedNode.type}
            onSuccess={handleRefresh}
          />
        </>
      )}
    </>
  );
}
