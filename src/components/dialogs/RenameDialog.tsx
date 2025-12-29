import { useState, useEffect } from 'react';
import { Dialog } from './Dialog';
import { invoke } from '@tauri-apps/api/core';

interface RenameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itemPath: string;
  itemName: string;
  itemType: 'file' | 'folder';
  onSuccess: () => void;
}

export function RenameDialog({ isOpen, onClose, itemPath, itemName, itemType, onSuccess }: RenameDialogProps) {
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNewName(itemName);
    }
  }, [isOpen, itemName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newName.trim()) {
      setError('Name cannot be empty');
      return;
    }

    if (newName === itemName) {
      onClose();
      return;
    }

    if (newName.includes('/') || newName.includes('\\')) {
      setError('Name cannot contain / or \\');
      return;
    }

    setIsRenaming(true);
    setError('');

    try {
      const pathParts = itemPath.split(/[/\\]/);
      pathParts[pathParts.length - 1] = newName;
      const newPath = pathParts.join('/');
      
      await invoke('rename_file', { oldPath: itemPath, newPath });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err as string || 'Failed to rename');
    } finally {
      setIsRenaming(false);
    }
  };

  const handleClose = () => {
    setNewName('');
    setError('');
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title={`Rename ${itemType === 'folder' ? 'Folder' : 'File'}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="newName" className="block text-[13px] text-[#CCCCCC] mb-2">
            New Name
          </label>
          <input
            id="newName"
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full px-3 py-2 bg-[#3C3C3C] border border-[#454545] rounded text-[13px] text-[#CCCCCC] placeholder-[#858585] focus:outline-none focus:border-[#007ACC]"
            disabled={isRenaming}
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
            disabled={isRenaming}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-[#007ACC] hover:bg-[#005A9E] text-white rounded text-[13px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isRenaming || !newName.trim() || newName === itemName}
          >
            {isRenaming ? 'Renaming...' : 'Rename'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
