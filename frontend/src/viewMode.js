import { useLocation } from 'react-router-dom';

/** True on the public member share path (/view/...). */
export function useIsViewOnly() {
  const { pathname } = useLocation();
  return pathname === '/view' || pathname.startsWith('/view/');
}

/** Keep links inside /view when browsing the member share. */
export function useAppLink() {
  const viewOnly = useIsViewOnly();
  return (path = '/') => {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    if (!viewOnly) return normalized;
    if (normalized === '/') return '/view';
    return `/view${normalized}`;
  };
}
