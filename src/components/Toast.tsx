import React, { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  trigger: boolean;
  onDismiss?: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, trigger, onDismiss, duration = 2000 }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (trigger) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        if (onDismiss) onDismiss();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [trigger, duration, onDismiss]);

  return (
    <div
      className={`pointer-events-auto fixed bottom-8 mx-4 flex items-center gap-2 rounded-lg bg-ctp-mantle px-6 py-3 text-ctp-base shadow-2xl transition-all duration-300 sm:max-w-sm ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0'
      }`}
      role="alert"
      aria-live="polite"
    >
      <span className="text-xl text-ctp-text">{message}</span>
    </div>
  );
};

export default Toast;
