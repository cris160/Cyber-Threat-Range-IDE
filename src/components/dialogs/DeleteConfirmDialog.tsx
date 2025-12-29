import { useState } from 'react';
import { Dialog } from './Dialog';
import { invoke } from '@tauri-apps/api/core';
import { AlertTriangle } from 'lucide-react';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itemPath: string;
  itemName: string;
  itemType: 'file' | 'folder';
  onSuccess: () => void;
}

export function DeleteConfirmDialog({ 
  isOpen, 
  onClose, 
  itemPath, 
  itemName, 
  itemType, 
  onSuccess 
}: DeleteConfirmDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setIsDeleting(true);
    setError('');

    try {
      await invoke('delete_file', { path: itemPath });
      onSuccess();
      handleClose();
    } catch (err) {
      setError(err as string || 'Failed to delete item');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setError('');
    setIsDeleting(false);
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title={`Delete ${itemType === 'folder' ? 'Folder' : 'File'}`}>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-yellow-500 flex-shrink-0 mt-1" size={20} />
          <div className="flex-1">
            <p className="text-[13px] text-[#CCCCCC] mb-2">
              Are you sure you want to delete <span className="font-semibold text-white">{itemName}</span>?
            </p>
            {itemType === 'folder' && (
              <p className="text-[12px] text-[#858585]">
                This will permanently delete the folder and all its contents.
              </p>
            )}
            <p className="text-[12px] text-red-400 mt-2">
              This action cannot be undone.
            </p>
          </div>
        </div>

        {error && (
          <div className="text-[12px] text-red-400 bg-red-900/20 px-3 py-2 rounded">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className="px-4 py-2 text-[13px] text-[#CCCCCC] hover:bg-[#2A2D2E] rounded transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 text-[13px] bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
