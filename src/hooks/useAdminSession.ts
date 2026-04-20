import { getIdTokenResult, onIdTokenChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import {
  hasLocalDevelopmentAdminSession,
  isLocalDevelopmentMode,
  LOCAL_DEV_ADMIN_UID,
  subscribeToLocalDevelopmentAdminSession,
} from '../lib/adminAccess';
import { getFirebaseAuth, isFirebaseConfigured } from '../lib/firebase';

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

    if (!isFirebaseConfigured()) {
      setState({
        isLoading: false,
        isAdmin: false,
        uid: null,
      });
      return;
    }

    const auth = getFirebaseAuth();

    return onIdTokenChanged(auth, async (user) => {
      if (!user) {
        setState({
          isLoading: false,
          isAdmin: false,
          uid: null,
        });
        return;
      }

      try {
        const tokenResult = await getIdTokenResult(user);
        setState({
          isLoading: false,
          isAdmin: tokenResult.claims.admin === true,
          uid: user.uid,
        });
      } catch (error) {
        console.error(error);
        setState({
          isLoading: false,
          isAdmin: false,
          uid: null,
        });
      }
    });
  }, []);

  return state;
}
