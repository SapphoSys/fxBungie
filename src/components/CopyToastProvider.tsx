import React, { useCallback, useEffect, useState } from 'react';
import Toast from './Toast';

const CopyToastProvider: React.FC = () => {
  const [showToast, setShowToast] = useState(false);
  const [headingText, setHeadingText] = useState<string | null>(null);

  const handleCopy = useCallback((e: Event) => {
    e.preventDefault();
    const btn = e.currentTarget as HTMLElement;
    const heading = btn.closest('h1, h2, h3, h4, h5, h6');
    if (heading && heading.id) {
      const url = `${window.location.origin}${window.location.pathname}#${heading.id}`;
      navigator.clipboard.writeText(url);
      let text = heading.textContent || heading.id;
      text = text.replace(/#+\s*$/, '').trim();
      setHeadingText(text);
      setShowToast(true);
    }
  }, []);

  useEffect(() => {
    const buttons = document.querySelectorAll('.heading-anchor-copy');
    buttons.forEach((btn) => {
      btn.addEventListener('click', handleCopy);
    });
    return () => {
      buttons.forEach((btn) => {
        btn.removeEventListener('click', handleCopy);
      });
    };
  }, [handleCopy]);

  return (
    <Toast
      message={headingText ? `Copied section link for ${headingText}` : 'Section link copied!'}
      trigger={showToast}
      onDismiss={() => setShowToast(false)}
    />
  );
};

export default CopyToastProvider;
