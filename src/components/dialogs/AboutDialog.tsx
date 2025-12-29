import { Dialog } from './Dialog';
import { Terminal, Code2, Sparkles, Shield, Bot } from 'lucide-react';

interface AboutDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutDialog({ isOpen, onClose }: AboutDialogProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="About CTR Secure IDE">
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-[#2D2D30]">
          <div className="bg-[#007ACC] p-3 rounded-lg flex items-center justify-center">
            <Shield size={28} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">CTR Secure IDE</h2>
            <p className="text-sm text-[#858585]">Secure coding workspace for developers</p>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <p className="text-[#CCCCCC]">
            A modern, security-focused code editor and terminal that helps developers learn and
            practice secure coding in a local, privacy-friendly environment.
          </p>

          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Code2 size={16} className="text-[#007ACC] mt-0.5" />
              <div>
                <p className="text-white font-medium">Secure Coding Workspace</p>
                <p className="text-[#858585]">
                  Integrated editor, terminal, and project tools designed for security-focused
                  development.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Terminal size={16} className="text-[#007ACC] mt-0.5" />
              <div>
                <p className="text-white font-medium">Safe Local Execution</p>
                <p className="text-[#858585]">
                  Run and test code locally while keeping source and data on your machine.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Bot size={16} className="text-[#007ACC] mt-0.5" />
              <div>
                <p className="text-white font-medium">AI Security Assistant</p>
                <p className="text-[#858585]">
                  Dedicated Security Review mode to help you understand vulnerabilities and safer
                  patterns while you code.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Shield size={16} className="text-[#007ACC] mt-0.5" />
              <div>
                <p className="text-white font-medium">Built-in Security Scanner & Challenges</p>
                <p className="text-[#858585]">
                  Static analysis on save, plus guided security challenges to practice fixing real
                  issues like command injection and hardcoded secrets.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[#2D2D30] space-y-2">
          <p className="text-xs text-[#858585]">
            Built with Tauri, React, TypeScript, and Tailwind CSS
          </p>
          <p className="text-xs text-[#858585]">
            © 2024 CTR Terminal. All rights reserved.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#007ACC] text-white rounded hover:bg-[#005A9E] transition-colors text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </Dialog>
  );
}
