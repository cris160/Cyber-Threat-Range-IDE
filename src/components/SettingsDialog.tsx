import { Settings, Code2, Terminal as TerminalIcon, Palette, Keyboard, Info } from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const [fontSize, setFontSize] = useState('13');
  const [tabSize, setTabSize] = useState('2');
  const [theme, setTheme] = useState('dark');
  const [minimap, setMinimap] = useState(true);
  const [lineNumbers, setLineNumbers] = useState(true);
  const [wordWrap, setWordWrap] = useState(false);
  const [autoSave, setAutoSave] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-[#252526] text-white border-[#454545]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Settings size={20} />
            Settings
          </DialogTitle>
          <DialogDescription className="text-[#CCCCCC]">
            Configure your IDE preferences
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="editor" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-[#1E1E1E]">
            <TabsTrigger value="editor" className="data-[state=active]:bg-[#37373D]">
              <Code2 size={16} className="mr-2" />
              Editor
            </TabsTrigger>
            <TabsTrigger value="terminal" className="data-[state=active]:bg-[#37373D]">
              <TerminalIcon size={16} className="mr-2" />
              Terminal
            </TabsTrigger>
            <TabsTrigger value="appearance" className="data-[state=active]:bg-[#37373D]">
              <Palette size={16} className="mr-2" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="shortcuts" className="data-[state=active]:bg-[#37373D]">
              <Keyboard size={16} className="mr-2" />
              Shortcuts
            </TabsTrigger>
          </TabsList>

          {/* Editor Settings */}
          <TabsContent value="editor" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[#CCCCCC]">Font Size</Label>
                <Select value={fontSize} onValueChange={setFontSize}>
                  <SelectTrigger className="bg-[#3C3C3C] border-[#454545]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#3C3C3C] border-[#454545]">
                    <SelectItem value="11">11px</SelectItem>
                    <SelectItem value="12">12px</SelectItem>
                    <SelectItem value="13">13px (Default)</SelectItem>
                    <SelectItem value="14">14px</SelectItem>
                    <SelectItem value="15">15px</SelectItem>
                    <SelectItem value="16">16px</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[#CCCCCC]">Tab Size</Label>
                <Select value={tabSize} onValueChange={setTabSize}>
                  <SelectTrigger className="bg-[#3C3C3C] border-[#454545]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#3C3C3C] border-[#454545]">
                    <SelectItem value="2">2 spaces</SelectItem>
                    <SelectItem value="4">4 spaces</SelectItem>
                    <SelectItem value="8">8 spaces</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator className="bg-[#454545]" />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-[#CCCCCC]">Show Line Numbers</Label>
                  <p className="text-[11px] text-[#858585]">Display line numbers in the editor</p>
                </div>
                <Switch checked={lineNumbers} onCheckedChange={setLineNumbers} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-[#CCCCCC]">Show Minimap</Label>
                  <p className="text-[11px] text-[#858585]">Display minimap overview on the right side</p>
                </div>
                <Switch checked={minimap} onCheckedChange={setMinimap} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-[#CCCCCC]">Word Wrap</Label>
                  <p className="text-[11px] text-[#858585]">Wrap long lines to fit in the viewport</p>
                </div>
                <Switch checked={wordWrap} onCheckedChange={setWordWrap} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-[#CCCCCC]">Auto Save</Label>
                  <p className="text-[11px] text-[#858585]">Automatically save files after editing</p>
                </div>
                <Switch checked={autoSave} onCheckedChange={setAutoSave} />
              </div>
            </div>
          </TabsContent>

          {/* Terminal Settings */}
          <TabsContent value="terminal" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[#CCCCCC]">Default Shell</Label>
                <Select defaultValue="bash">
                  <SelectTrigger className="bg-[#3C3C3C] border-[#454545]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#3C3C3C] border-[#454545]">
                    <SelectItem value="bash">Bash</SelectItem>
                    <SelectItem value="zsh">Zsh</SelectItem>
                    <SelectItem value="powershell">PowerShell</SelectItem>
                    <SelectItem value="cmd">Command Prompt</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[#CCCCCC]">Terminal Font Size</Label>
                <Select defaultValue="13">
                  <SelectTrigger className="bg-[#3C3C3C] border-[#454545]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#3C3C3C] border-[#454545]">
                    <SelectItem value="11">11px</SelectItem>
                    <SelectItem value="12">12px</SelectItem>
                    <SelectItem value="13">13px (Default)</SelectItem>
                    <SelectItem value="14">14px</SelectItem>
                    <SelectItem value="15">15px</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* Appearance Settings */}
          <TabsContent value="appearance" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[#CCCCCC]">Theme</Label>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger className="bg-[#3C3C3C] border-[#454545]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#3C3C3C] border-[#454545]">
                    <SelectItem value="dark">Dark (Default)</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="high-contrast">High Contrast</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator className="bg-[#454545]" />

              <div className="space-y-2">
                <Label className="text-[#CCCCCC]">Color Scheme</Label>
                <p className="text-[11px] text-[#858585]">Choose syntax highlighting colors</p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button className="p-3 bg-[#1E1E1E] border-2 border-[#007ACC] rounded-lg text-[11px]">
                    VS Code Dark
                  </button>
                  <button className="p-3 bg-[#1E1E1E] border border-[#454545] rounded-lg text-[11px] hover:border-[#007ACC]">
                    Monokai
                  </button>
                  <button className="p-3 bg-[#1E1E1E] border border-[#454545] rounded-lg text-[11px] hover:border-[#007ACC]">
                    Dracula
                  </button>
                  <button className="p-3 bg-[#1E1E1E] border border-[#454545] rounded-lg text-[11px] hover:border-[#007ACC]">
                    Solarized
                  </button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Keyboard Shortcuts */}
          <TabsContent value="shortcuts" className="space-y-4 mt-6">
            <div className="space-y-3">
              <h3 className="text-[13px] font-semibold text-[#CCCCCC]">Editor</h3>
              <div className="space-y-2">
                <ShortcutRow label="Save File" keys={['Ctrl', 'S']} />
                <ShortcutRow label="Close File" keys={['Ctrl', 'W']} />
                <ShortcutRow label="Find" keys={['Ctrl', 'F']} />
                <ShortcutRow label="Replace" keys={['Ctrl', 'H']} />
              </div>

              <Separator className="bg-[#454545] my-4" />

              <h3 className="text-[13px] font-semibold text-[#CCCCCC]">Navigation</h3>
              <div className="space-y-2">
                <ShortcutRow label="Quick Open" keys={['Ctrl', 'P']} />
                <ShortcutRow label="Command Palette" keys={['Ctrl', 'Shift', 'P']} />
                <ShortcutRow label="Toggle Sidebar" keys={['Ctrl', 'B']} />
                <ShortcutRow label="Toggle Terminal" keys={['Ctrl', '`']} />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between pt-4 border-t border-[#454545]">
          <div className="flex items-center gap-2 text-[11px] text-[#858585]">
            <Info size={14} />
            <span>Settings are saved automatically</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#007ACC] hover:bg-[#005A9E] text-white rounded text-[13px]"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ShortcutRow({ label, keys }: { label: string; keys: string[] }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[12px] text-[#CCCCCC]">{label}</span>
      <div className="flex gap-1">
        {keys.map((key) => (
          <kbd
            key={key}
            className="px-2 py-1 bg-[#3C3C3C] border border-[#454545] rounded text-[11px] text-[#CCCCCC]"
          >
            {key}
          </kbd>
        ))}
      </div>
    </div>
  );
}
