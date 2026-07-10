import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  checkForDatabaseUpdates,
  downloadDatabaseUpdates,
  initialiseDatabase,
  loadDatabase,
  resetToBundledDatabase,
} from '../services/DatabaseService';

const DatabaseContext = createContext(null);

export function DatabaseProvider({ children }) {
  const [database, setDatabase] = useState({
    manifest: null,
    byManufacturer: {},
  });

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const nextDatabase = await loadDatabase();
    setDatabase(nextDatabase);
    return nextDatabase;
  }, []);

  useEffect(() => {
    let mounted = true;

    async function startDatabase() {
      setLoading(true);
      setError('');

      try {
        const initialDatabase = await initialiseDatabase();

        if (mounted) {
          setDatabase(initialDatabase);
        }
      } catch (databaseError) {
        console.error('Database initialisation failed:', databaseError);

        if (mounted) {
          setError(
            databaseError?.message ||
              'The vehicle database could not be loaded.'
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    startDatabase();

    return () => {
      mounted = false;
    };
  }, []);

  const updateDatabase = useCallback(async () => {
    setUpdating(true);
    setError('');

    try {
      const { remote, changed } = await checkForDatabaseUpdates();

      if (!changed.length) {
        return {
          updatedBrands: [],
          upToDate: true,
        };
      }

      const updatedBrands = await downloadDatabaseUpdates(remote, changed);

      await refresh();

      return {
        updatedBrands,
        upToDate: false,
      };
    } catch (updateError) {
      console.error('Database update failed:', updateError);

      const message =
        updateError?.message || 'The database update could not be completed.';

      setError(message);
      throw updateError;
    } finally {
      setUpdating(false);
    }
  }, [refresh]);

  const resetDatabase = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const restoredDatabase = await resetToBundledDatabase();
      setDatabase(restoredDatabase);

      return restoredDatabase;
    } catch (resetError) {
      console.error('Database reset failed:', resetError);

      const message =
        resetError?.message || 'The bundled database could not be restored.';

      setError(message);
      throw resetError;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError('');
  }, []);

  const value = useMemo(
    () => ({
      manifest: database.manifest,
      byManufacturer: database.byManufacturer,
      loading,
      updating,
      error,
      refresh,
      updateDatabase,
      resetDatabase,
      clearError,
    }),
    [
      database,
      loading,
      updating,
      error,
      refresh,
      updateDatabase,
      resetDatabase,
      clearError,
    ]
  );

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  const context = useContext(DatabaseContext);

  if (!context) {
    throw new Error(
      'useDatabase must be used inside the DatabaseProvider component.'
    );
  }

  return context;
}
