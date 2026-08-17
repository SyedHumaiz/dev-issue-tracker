let accessToken: string | null = null;
let unauthorizedHandler: (() => Promise<void>) | null = null;

export const setAccessToken = (token: string | null) => { accessToken = token; };
export const getAccessToken = () => accessToken;
export const setUnauthorizedHandler = (handler: (() => Promise<void>) | null) => { unauthorizedHandler = handler; };
export const handleUnauthorized = async () => { await unauthorizedHandler?.(); };
