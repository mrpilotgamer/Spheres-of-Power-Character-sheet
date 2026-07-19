import { useId } from 'react';

export default function SphereMark({ size = 30 }) {
  // Unique per instance so two marks on the same page (e.g. sidebar + a future
  // second render) don't collide on a hardcoded gradient id.
  const gradientId = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="8" fill={`url(#${gradientId})`} />
      <ellipse cx="20" cy="20" rx="17" ry="7" stroke="#c99a3d" strokeWidth="1.2" opacity="0.7" />
      <ellipse cx="20" cy="20" rx="17" ry="7" stroke="#a48af0" strokeWidth="1" opacity="0.5" transform="rotate(60 20 20)" />
      <circle cx="36.5" cy="20" r="2.6" fill="#e0b355" />
      <circle cx="7.2" cy="24.6" r="2" fill="#a48af0" />
      <defs>
        <radialGradient id={gradientId} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0%" stopColor="#a48af0" />
          <stop offset="100%" stopColor="#6a4dc9" />
        </radialGradient>
      </defs>
    </svg>
  );
}
