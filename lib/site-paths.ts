/** Build-time deployment settings. The Sites build keeps root-relative defaults. */
declare const __STARAPP_BASE_PATH__: string | undefined;
declare const __STARAPP_API_ORIGIN__: string | undefined;

const configuredBase = typeof __STARAPP_BASE_PATH__ === 'string' ? __STARAPP_BASE_PATH__ : '/';
const basePath = `/${configuredBase.replace(/^\/+|\/+$/g, '')}${configuredBase.replace(/^\/+|\/+$/g, '') ? '/' : ''}`;
const apiOrigin = typeof __STARAPP_API_ORIGIN__ === 'string' ? __STARAPP_API_ORIGIN__.replace(/\/+$/, '') : '';

/** Resolve public assets and page links beneath the current deployment path. */
export function sitePath(path = ''): string {
  return `${basePath}${path.replace(/^\/+/, '')}`;
}

/** Public endpoint location; no credential or private configuration belongs here. */
export function apiPath(path: string): string {
  return `${apiOrigin}/${path.replace(/^\/+/, '')}`;
}
