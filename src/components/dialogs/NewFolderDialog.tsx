import { useState } from 'react';
import { Dialog } from './Dialog';
import { invoke } from '@tauri-apps/api/core';

interface NewFolderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
  onSuccess: () => void;
}

export function NewFolderDialog({ isOpen, onClose, currentPath, onSuccess }: NewFolderDialogProps) {
  const [folderName, setFolderName] = useState('');
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!folderName.trim()) {
      setError('Folder name cannot be empty');
      return;
    }

    if (folderName.includes('/') || folderName.includes('\\')) {
      setError('Folder name cannot contain / or \\');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const folderPath = `${currentPath}${currentPath.endsWith('/') || currentPath.endsWith('\\') ? '' : '/'}${folderName}`;
      await invoke('create_directory', { path: folderPath });
      setFolderName('');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err as string || 'Failed to create folder');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setFolderName('');
    setError('');
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title="New Folder">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="folderName" className="block text-[13px] text-[#CCCCCC] mb-2">
            Folder Name
          </label>
          <input
            id="folderName"
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="new-folder"
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
            disabled={isCreating || !folderName.trim()}
          >
            {isCreating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
