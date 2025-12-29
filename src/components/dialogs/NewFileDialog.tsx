import { useState } from 'react';
import { Dialog } from './Dialog';
import { invoke } from '@tauri-apps/api/core';

interface NewFileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
  onSuccess: () => void;
}

export function NewFileDialog({ isOpen, onClose, currentPath, onSuccess }: NewFileDialogProps) {
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fileName.trim()) {
      setError('File name cannot be empty');
      return;
    }

    if (fileName.includes('/') || fileName.includes('\\')) {
      setError('File name cannot contain / or \\');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const filePath = `${currentPath}${currentPath.endsWith('/') || currentPath.endsWith('\\') ? '' : '/'}${fileName}`;
      await invoke('create_file', { path: filePath });
      setFileName('');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err as string || 'Failed to create file');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setFileName('');
    setError('');
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title="New File">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="fileName" className="block text-[13px] text-[#CCCCCC] mb-2">
            File Name
          </label>
          <input
            id="fileName"
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="example.txt"
            className="w-full px-3 py-2 bg-[#3C3C3C] border border-[#454545] rounded text-[13px] text-[#CCCCCC] placeholder-[#858585] focus:outline-none focus:border-[#007ACC]"
            disabled={isCreating}
          />
          {error && (
            <p className="mt-2 text-[12px] text-red-400">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 bg-[#3C3C3C] hover:bg-[#505050] text-[#CCCCCC] rounded text-[13px] transition-colors"
            disabled={isCreating}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-[#007ACC] hover:bg-[#005A9E] text-white rounded text-[13px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isCreating || !fileName.trim()}
          >
            {isCreating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
