'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';

interface ToastProps {
  message: string;
  variant?: 'success' | 'error' | 'info';
  duration?: number;
  onClose: () => void;
}

export function Toast({ message, variant = 'info', duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className={clsx(
      'fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-elevated transition-all duration-300',
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
      variant === 'success' && 'bg-success text-white',
      variant === 'error' && 'bg-danger text-white',
      variant === 'info' && 'bg-bg-elevated text-text-primary'
    )}>
      {message}
    </div>
  );
}

// Toast manager for global toast usage
type ToastItem = {
  id: string;
  message: string;
  variant: 'success' | 'error' | 'info';
};

let toastCounter = 0;
const toastListeners: ((toasts: ToastItem[]) => void)[] = [];

export function showToast(message: string, variant: 'success' | 'error' | 'info' = 'info') {
  const id = String(++toastCounter);
  const toast: ToastItem = { id, message, variant };

  // Dispatch to all listeners
  toastListeners.forEach(listener => {
    listener([toast]);
  });

  return id;
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const listener = (newToasts: ToastItem[]) => {
      setToasts(prev => [...prev, ...newToasts]);
    };

    toastListeners.push(listener);

    return () => {
      const index = toastListeners.indexOf(listener);
      if (index > -1) toastListeners.splice(index, 1);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          variant={toast.variant}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}
