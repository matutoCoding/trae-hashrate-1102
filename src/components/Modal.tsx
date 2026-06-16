import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={`relative glass-card w-full ${sizeClasses[size]} p-6 animate-slide-up max-h-[90vh] overflow-y-auto scrollbar-thin`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl font-bold text-barber-cream">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-barber-darker flex items-center justify-center text-barber-silver hover:text-barber-cream transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
