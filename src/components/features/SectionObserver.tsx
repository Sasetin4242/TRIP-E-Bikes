import { useEffect, useRef, useState } from "react";

interface SectionObserverProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export default function SectionObserver({ children, delay = 0, className = "" }: SectionObserverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`intersection-observer-fade ${visible ? "visible" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
