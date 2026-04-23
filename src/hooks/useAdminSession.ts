import { useEffect, useState } from 'react';
import {
  hasLocalDevelopmentAdminSession,
  isLocalDevelopmentMode,
  LOCAL_DEV_ADMIN_UID,
  subscribeToLocalDevelopmentAdminSession,
} from '../lib/adminAccess';
import {
  getStoredAdminSessionPayload,
  subscribeToAdminSession,
} from '../lib/adminSession';

interface AdminSessionState {
  isLoading: boolean;
  isAdmin: boolean;
  uid: string | null;
}

const INITIAL_STATE: AdminSessionState = {
  isLoading: true,
  isAdmin: false,
  uid: null,
};

export function useAdminSession() {
  const [state, setState] = useState<AdminSessionState>(INITIAL_STATE);

  useEffect(() => {
    if (isLocalDevelopmentMode()) {
      const syncLocalSession = () => {
        const isAdmin = hasLocalDevelopmentAdminSession();

        setState({
          isLoading: false,
          isAdmin,
          uid: isAdmin ? LOCAL_DEV_ADMIN_UID : null,
        });
      };

      syncLocalSession();
      return subscribeToLocalDevelopmentAdminSession(syncLocalSession);
    }

    const syncSession = () => {
      const payload = getStoredAdminSessionPayload();
      const isAdmin = payload?.admin === true;

      setState({
        isLoading: false,
        isAdmin,
        uid: isAdmin ? payload?.uid || 'rk-events-admin' : null,
      });
    };

    syncSession();
    return subscribeToAdminSession(syncSession);
  }, []);

  return state;
}
