import { } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { HackerModeToggle } from './HackerModeToggle';

interface MenuBarProps {
  onNewFile?: () => void;
  onNewFolder?: () => void;
  onOpen?: () => void;
  onOpenFile?: () => void;
  onOpenFolder?: () => void;
  onSave?: () => void;
  onCloseFile?: () => void;
  onFind?: () => void;
  onReplace?: () => void;
  onToggleTerminal?: () => void;
  onShowAbout?: () => void;
  onRunCode?: () => void;
}

interface DropdownMenu {
  items: {
    label: string;
    shortcut?: string;
    divider?: boolean;
    action?: () => void;
  }[];
}

export function MenuBar({
  onNewFile,
  onNewFolder,
  onOpen,
  onOpenFile,
  onOpenFolder,
  onSave,
  onCloseFile,
  onFind,
  onReplace,
  onToggleTerminal,
  onShowAbout,
  onRunCode
}: MenuBarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const menus: Record<string, DropdownMenu> = {
    File: {
      items: [
        { label: 'New File', shortcut: 'Ctrl+N', action: onNewFile },
        { label: 'New Folder', action: onNewFolder },
        { label: 'Open File...', shortcut: 'Ctrl+O', action: onOpenFile },
        { label: 'Open Folder...', shortcut: 'Ctrl+K Ctrl+O', action: onOpenFolder },
        { label: '', divider: true },
        { label: 'Save', shortcut: 'Ctrl+S', action: onSave },
        { label: 'Save As...', shortcut: 'Ctrl+Shift+S' },
        { label: 'Save All', shortcut: 'Ctrl+K S' },
        { label: '', divider: true },
        { label: 'Close File', shortcut: 'Ctrl+W', action: onCloseFile },
        { label: 'Close Folder', shortcut: 'Ctrl+K F' },
        { label: 'Exit', shortcut: 'Ctrl+Q' },
      ],
    },
    Edit: {
      items: [
        { label: 'Undo', shortcut: 'Ctrl+Z' },
        { label: 'Redo', shortcut: 'Ctrl+Y' },
        { label: '', divider: true },
        { label: 'Cut', shortcut: 'Ctrl+X' },
        { label: 'Copy', shortcut: 'Ctrl+C' },
        { label: 'Paste', shortcut: 'Ctrl+V' },
        { label: '', divider: true },
        { label: 'Find', shortcut: 'Ctrl+F', action: onFind },
        { label: 'Replace', shortcut: 'Ctrl+H', action: onReplace },
        { label: 'Find in Files', shortcut: 'Ctrl+Shift+F' },
      ],
    },
    Selection: {
      items: [
        { label: 'Select All', shortcut: 'Ctrl+A' },
        { label: 'Expand Selection', shortcut: 'Shift+Alt+Right' },
        { label: 'Shrink Selection', shortcut: 'Shift+Alt+Left' },
        { label: '', divider: true },
        { label: 'Add Cursor Above', shortcut: 'Ctrl+Alt+Up' },
        { label: 'Add Cursor Below', shortcut: 'Ctrl+Alt+Down' },
        { label: 'Add Cursors to Line Ends', shortcut: 'Shift+Alt+I' },
      ],
    },
    View: {
      items: [
        { label: 'Command Palette', shortcut: 'Ctrl+Shift+P' },
        { label: 'Open View...', shortcut: 'Ctrl+Q' },
        { label: '', divider: true }, { label: 'Explorer', shortcut: 'Ctrl+Shift+E' },
        { label: 'Search', shortcut: 'Ctrl+Shift+F' },
        { label: 'Source Control', shortcut: 'Ctrl+Shift+G' },
        { label: 'Extensions', shortcut: 'Ctrl+Shift+X' },
        { label: '', divider: true },
        { label: 'Terminal', shortcut: 'Ctrl+`', action: onToggleTerminal },
        { label: 'Output', shortcut: 'Ctrl+Shift+U' },
        { label: '', divider: true },
        { label: 'Toggle Sidebar', shortcut: 'Ctrl+B' },
        { label: 'Toggle Panel', shortcut: 'Ctrl+J' },
        { label: 'Toggle Full Screen', shortcut: 'F11' },
      ],
    },
    Go: {
      items: [
        { label: 'Back', shortcut: 'Alt+Left' },
        { label: 'Forward', shortcut: 'Alt+Right' },
        { label: '', divider: true },
        { label: 'Go to File...', shortcut: 'Ctrl+P' },
        { label: 'Go to Line...', shortcut: 'Ctrl+G' },
        { label: 'Go to Symbol...', shortcut: 'Ctrl+Shift+O' },
      ],
    },
    Run: {
      items: [
        { label: 'Run Code', shortcut: 'Ctrl+Shift+R', action: onRunCode },
        { label: '', divider: true },
        { label: 'Start Debugging', shortcut: 'F5' },
        { label: 'Run Without Debugging', shortcut: 'Ctrl+F5' },
        { label: 'Stop', shortcut: 'Shift+F5' },
        { label: '', divider: true },
        { label: 'Run Task...', shortcut: 'Ctrl+Shift+B' },
      ],
    },
    Terminal: {
      items: [
        { label: 'New Terminal', shortcut: 'Ctrl+Shift+`', action: onToggleTerminal },
        { label: 'Split Terminal', shortcut: 'Ctrl+Shift+5' },
        { label: '', divider: true },
        { label: 'Run Selected Text', shortcut: 'Ctrl+Shift+R' },
        { label: 'Run Active File' },
        { label: '', divider: true },
        { label: 'Clear', shortcut: 'Ctrl+K' },
      ],
    },
    Help: {
      items: [
        { label: 'Welcome' },
        { label: 'Secure Coding Overview' },
        { label: 'Documentation' },
        { label: 'Show All Commands', shortcut: 'Ctrl+Shift+P' },
        { label: '', divider: true },
        { label: 'Keyboard Shortcuts', shortcut: 'Ctrl+K Ctrl+S' },
        { label: '', divider: true },
        { label: 'About CTR Secure IDE', action: onShowAbout },
      ],
    },
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // Check if click is outside both the menu bar and the dropdown
      if (menuRef.current && !menuRef.current.contains(target)) {
        // Also check if click is not on the dropdown menu itself
        const dropdownMenu = document.querySelector('[data-dropdown-menu="true"]');
        if (!dropdownMenu || !dropdownMenu.contains(target)) {
          setActiveMenu(null);
        }
      }
    };

    if (activeMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [activeMenu]);

  const handleMenuClick = (menuName: string) => {
    if (activeMenu === menuName) {
      setActiveMenu(null);
    } else {
      const button = buttonRefs.current[menuName];
      if (button) {
        const rect = button.getBoundingClientRect();
        setMenuPosition({
          top: rect.bottom + 4,
          left: rect.left
        });
      }
      setActiveMenu(menuName);
    }
  };

  const handleItemClick = (item: { label: string; action?: () => void }) => {
    if (item.action) {
      item.action();
    }
    setActiveMenu(null);
  };

  return (
    <>
      <div
        ref={menuRef}
        className="flex items-center select-none"
        style={{ height: '30px', backgroundColor: '#3c3c3c' }}
        data-tauri-drag-region
      >
        {/* App Icon/Logo */}
        <div style={{ width: '40px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#569cd6', fontWeight: 'bold', fontSize: '11px' }}>CTR</span>
        </div>

        {/* Menu items */}
        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          {Object.keys(menus).map((menuName) => (
            <button
              key={menuName}
              ref={(el) => { buttonRefs.current[menuName] = el; }}
              onClick={() => handleMenuClick(menuName)}
              style={{
                padding: '0 10px',
                height: '100%',
                fontSize: '13px',
                color: '#cccccc',
                background: activeMenu === menuName ? '#505050' : 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => { if (activeMenu !== menuName) e.currentTarget.style.background = '#4a4a4a'; }}
              onMouseLeave={(e) => { if (activeMenu !== menuName) e.currentTarget.style.background = 'transparent'; }}
            >
              {menuName}
            </button>
          ))}
        </div>

        {/* Center - Draggable title area */}
        <div
          style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          data-tauri-drag-region
        >
          <span style={{ fontSize: '12px', color: '#999999', pointerEvents: 'none' }}>
            CTR - Cyber Threat Range IDE
          </span>
        </div>

        {/* Right side - Hacker Mode + Window Controls */}
        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <HackerModeToggle />

          {/* Minimize */}
          <button
            onClick={() => getCurrentWindow().minimize()}
            style={{
              width: '46px',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#cccccc',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#505050'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            title="Minimize"
          >
            <svg width="10" height="1" viewBox="0 0 10 1">
              <rect fill="currentColor" width="10" height="1" />
            </svg>
          </button>

          {/* Maximize */}
          <button
            onClick={async () => {
              const win = getCurrentWindow();
              if (await win.isMaximized()) {
                win.unmaximize();
              } else {
                win.maximize();
              }
            }}
            style={{
              width: '46px',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#cccccc',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#505050'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            title="Maximize"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <rect x="0" y="0" width="10" height="10" stroke="currentColor" strokeWidth="1" />
            </svg>
          </button>

          {/* Close */}
          <button
            onClick={() => getCurrentWindow().close()}
            style={{
              width: '46px',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#cccccc',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#e81123'; e.currentTarget.style.color = '#ffffff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#cccccc'; }}
            title="Close"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M0.5 0.5L9.5 9.5M9.5 0.5L0.5 9.5" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Dropdown Menu - Rendered at top level with fixed positioning */}
      {activeMenu && (
        <div
          data-dropdown-menu="true"
          className="fixed min-w-[220px] bg-[#252526] border border-[#454545] shadow-lg rounded-md py-1"
          style={{
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
            zIndex: 9999
          }}
        >
          {menus[activeMenu].items.map((item, index) => (
            item.divider ? (
              <div key={index} className="h-px bg-[#454545] my-1" />
            ) : (
              <button
                key={index}
                onClick={() => handleItemClick(item)}
                className="w-full px-4 py-1.5 text-left text-[13px] text-[#CCCCCC] hover:bg-[#2A2D2E] flex items-center justify-between"
              >
                <span>{item.label}</span>
                {item.shortcut && (
                  <span className="text-[11px] text-[#858585] ml-8">{item.shortcut}</span>
                )}
              </button>
            )
          ))}
        </div>
      )}
    </>
  );
}
