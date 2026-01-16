export interface StoredSession {
    accessToken: string;
    refreshToken: string;
}
export declare const storeSession: (session: StoredSession) => Promise<void>;
export declare const getSession: () => Promise<StoredSession | null>;
export declare const clearSession: () => Promise<void>;
export declare const getAccessToken: () => Promise<string | null>;
export declare const updateAccessToken: (accessToken: string) => Promise<void>;
//# sourceMappingURL=supabaseSession.d.ts.map