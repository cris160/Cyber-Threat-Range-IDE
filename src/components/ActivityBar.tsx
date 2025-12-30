import { Files, Search, GitBranch, Bug, Package, Bot, Shield, ShieldAlert, Crosshair, LayoutDashboard, Wrench } from 'lucide-react';

interface ActivityBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isChatbotOpen: boolean;
  onChatbotToggle: () => void;
}

export function ActivityBar({ activeTab, onTabChange, isChatbotOpen, onChatbotToggle }: ActivityBarProps) {
  const tabs = [
    { id: 'explorer', icon: Files, label: 'Explorer' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'dashboard', icon: LayoutDashboard, label: 'Security Dashboard' },
    { id: 'source-control', icon: GitBranch, label: 'Source Control' },
    { id: 'debug', icon: Bug, label: 'Debug' },
    { id: 'security', icon: Shield, label: 'Security Scan' },
    { id: 'exploit-prover', icon: ShieldAlert, label: 'Exploit Prover' },
    { id: 'exploit', icon: Crosshair, label: 'Exploit Simulator' },
    { id: 'security-tools', icon: Wrench, label: 'Security Tools' },
    { id: 'extensions', icon: Package, label: 'Extensions' },
  ];

  return (
    <div className="w-12 bg-[#1E1E1E] border-r border-[#2D2D30] flex flex-col items-center py-4 gap-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`w-full h-12 flex items-center justify-center transition-colors relative ${activeTab === tab.id
              ? 'text-white'
              : 'text-[#858585] hover:text-white'
              }`}
            title={tab.label}
          >
            <Icon size={24} />
            {activeTab === tab.id && (
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-white" />
            )}
          </button>
        );
      })}

      {/* Separator */}
      <div className="w-8 h-px bg-[#2D2D30] my-2" />

      {/* AI Chatbot Toggle */}
      <button
        onClick={onChatbotToggle}
        className={`w-full h-12 flex items-center justify-center transition-colors relative ${isChatbotOpen
          ? 'text-white'
          : 'text-[#858585] hover:text-white'
          }`}
        title="AI Assistant"
      >
        <Bot size={24} />
        {isChatbotOpen && (
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-white" />
        )}
      </button>
    </div>
  );
}