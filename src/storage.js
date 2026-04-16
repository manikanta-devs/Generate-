// localStorage-backed window.storage adapter
const storage = {
  get: async (key) => {
    try {
      const value = localStorage.getItem('ll_' + key);
      return value !== null ? { value } : null;
    } catch {
      return null;
    }
  },
  set: async (key, value) => {
    localStorage.setItem('ll_' + key, value);
  },
  delete: async (key) => {
    localStorage.removeItem('ll_' + key);
  },
};

export default storage;
