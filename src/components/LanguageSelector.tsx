import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const LanguageSelector = () => {
  const { language, changeLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const languages = [
    { code: 'en' as const, name: 'English', flag: '🇺🇸' },
    { code: 'es' as const, name: 'Español', flag: '🇪🇸' },
    { code: 'fr' as const, name: 'Français', flag: '🇫🇷' },
    { code: 'ar' as const, name: 'العربية', flag: '🇸🇦' },
  ];

  useEffect(() => {
    const updatePosition = () => {
      if (isOpen && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setPosition({
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right,
        });
      }
    };

    if (isOpen) {
      // Reset position first, then calculate
      setPosition(null);
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        updatePosition();
      });
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
    } else {
      setPosition(null);
    }

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 text-white hover:shadow-lg transition-all duration-200 border border-white/20"
        >
          <Globe size={18} />
          <span className="hidden sm:inline">{languages.find(l => l.code === language)?.flag}</span>
          <span className="hidden sm:inline">{languages.find(l => l.code === language)?.name}</span>
        </button>
      </div>
      {isOpen && position && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0"
            style={{ zIndex: 99998 }}
            onClick={() => setIsOpen(false)}
          />
          <div
            ref={dropdownRef}
            className="fixed bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden min-w-[192px]"
            style={{
              top: `${position.top}px`,
              right: `${position.right}px`,
              zIndex: 99999,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  changeLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 hover:bg-purple-50 transition-colors first:rounded-t-lg last:rounded-b-lg flex items-center gap-2 ${
                  language === lang.code ? 'bg-purple-100 text-purple-700 font-medium' : 'text-gray-700'
                }`}
              >
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </>
  );
};

export default LanguageSelector;

