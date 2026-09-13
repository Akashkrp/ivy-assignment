import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Bellandur3DMap from './Bellandur3DMap';

export default function BellandurSimulationModal({ isOpen, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-slate-950/80 backdrop-blur-md">
          {/* Centered Scrollable Wrapper */}
          <div className="min-h-full flex items-center justify-center p-2 sm:p-4 md:p-6 text-center">
            {/* Backdrop Click Target */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 -z-10"
              onClick={onClose}
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative w-full max-w-6xl my-auto text-left"
              onClick={(e) => e.stopPropagation()}
            >
              <Bellandur3DMap onClose={onClose} />
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
