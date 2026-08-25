import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      // Don't fire when typing in inputs
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      switch (e.key) {
        case '1': navigate('/dashboard');  break;
        case '2': navigate('/stops');      break;
        case '3': navigate('/routes');     break;
        case '4': navigate('/fares');      break;
        case '5': navigate('/search');     break;
        case '6': navigate('/calculator'); break;
        case '7': navigate('/matrix');     break;
        case '8': navigate('/import');     break;
        case '9': navigate('/coverage');   break;
        case '0': navigate('/routecard');  break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);
}
