import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  checkForDatabaseUpdates,
  downloadDatabaseUpdates,
  initialiseDatabase,
  loadDatabase,
  resetToBundledDatabase,
} from '../services/DatabaseService';

const DatabaseContext = createContext(null);

export function DatabaseProvider({ children }) {
  const [database, setDatabase] = useState({ manifest: null, byManufacturer: {} });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const next = await loadDatabase();
    setDatabase(next);
    return next;
  }, []);

  useEffect(() => {
    initialiseDatabase()
      .then(setDatabase)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const updateDatabase = useCallback(async () => {
    setUpdating(true);
    setError('');
    try {
      const { remote, changed } = await checkForDatabaseUpdates();
      if (changed.length === 0) return { updatedBrands: [], upToDate: true };
      const updatedBrands = await downloadDatabaseUpdates(remote, changed);
      await refresh();
      return { updatedBrands, upToDate: false };
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setUpdating(false);
    }
  }, [refresh]);

  const resetDatabase = useCallback(async () => {
    setLoading(true);
    try {
      const next = await resetToBundledDatabase();
      setDatabase(next);
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo(() => ({
    ...database,
    loading,
    updating,
    error,
    refresh,
    updateDatabase,
    resetDatabase,
  }), [database, loading, updating, error, refresh, updateDatabase, resetDatabase]);

  return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>;
}

export function useDatabase() {
  const value = useContext(DatabaseContext);
  if (!value) throw new Error('useDatabase must be inside DatabaseProvider.');
  return value;
}
