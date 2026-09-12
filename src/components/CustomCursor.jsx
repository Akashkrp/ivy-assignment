import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export default function CustomCursor() {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hoverType, setHoverType] = useState('default');
  const [isClicked, setIsClicked] = useState(false);

  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  // Smooth springs for fluid outer ring movement
  const springConfig = { damping: 24, stiffness: 280, mass: 0.5 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  useEffect(() => {
    // Only active on devices with fine pointer (mouse/trackpad)
    if (window.matchMedia('(pointer: coarse)').matches) {
      return;
    }

    const handleMouseMove = (e) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseDown = () => setIsClicked(true);
    const handleMouseUp = () => setIsClicked(false);
    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    const handleOver = (e) => {
      const target = e.target;
      if (!target) return;

      const interactive = target.closest(
        'button, a, input, select, textarea, [role="button"], .cursor-pointer, .group'
      );

      if (interactive) {
        setIsHovered(true);
        if (interactive.tagName === 'INPUT' || interactive.tagName === 'TEXTAREA') {
          setHoverType('text');
        } else if (interactive.closest('.group')) {
          setHoverType('card');
        } else {
          setHoverType('button');
        }
      } else {
        setIsHovered(false);
        setHoverType('default');
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseover', handleOver);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseover', handleOver);
    };
  }, [isVisible, mouseX, mouseY]);

  if (!isVisible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      
      {/* Outer Spring Ring */}
      <motion.div
        style={{
          x: smoothX,
          y: smoothY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          scale: isClicked ? 0.75 : isHovered ? (hoverType === 'card' ? 2.4 : 1.8) : 1,
          borderColor: isHovered ? 'rgba(52, 211, 153, 0.9)' : 'rgba(16, 185, 129, 0.45)',
          backgroundColor: isHovered ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.02)',
          borderWidth: isHovered ? '1.5px' : '1px',
        }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="w-8 h-8 rounded-full border border-emerald-400/40 backdrop-blur-[0.5px] flex items-center justify-center shadow-lg shadow-emerald-500/10"
      >
        {/* Futuristic target tick lines on hover */}
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0 }}
            className="w-full h-full relative"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-0.5 bg-emerald-400" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-0.5 bg-emerald-400" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-1.5 bg-emerald-400" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-1.5 bg-emerald-400" />
          </motion.div>
        )}
      </motion.div>

      {/* Inner Pinpoint Glow Dot (Direct Mouse Track) */}
      <motion.div
        style={{
          x: mouseX,
          y: mouseY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          scale: isClicked ? 1.5 : isHovered ? 0.5 : 1,
          backgroundColor: isHovered ? '#34d399' : '#10b981',
        }}
        transition={{ duration: 0.1 }}
        className="w-2 h-2 rounded-full shadow-md shadow-emerald-400/80 pointer-events-none"
      />

    </div>
  );
}
