import { useEffect, useRef } from 'react';

export const CyberBackground = () => {
  const particlesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const createParticle = () => {
      if (!particlesRef.current) return;

      const particle = document.createElement('div');
      particle.className = 'particle';

      particle.style.left = Math.random() * 100 + '%';
      particle.style.animationDelay = Math.random() * 6 + 's';
      particle.style.animationDuration = (Math.random() * 4 + 6) + 's';

      particlesRef.current.appendChild(particle);

      setTimeout(() => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
      }, 10000);
    };

    for (let i = 0; i < 20; i++) {
      setTimeout(() => createParticle(), i * 200);
    }

    const interval = setInterval(createParticle, 800);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return <div ref={particlesRef} className="particles" />;
};
