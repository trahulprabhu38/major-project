import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Global Zustand Store
 * Manages app-wide state including user data, courses cache, and UI preferences
 */

const useStore = create(
  persist(
    (set, get) => ({
      // User State
      user: null,
      token: null,
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      clearAuth: () => set({ user: null, token: null, coursesCache: null }),

      // Courses Cache
      coursesCache: null,
      coursesLastFetched: null,
      setCourses: (courses) => set({
        coursesCache: courses,
        coursesLastFetched: Date.now()
      }),
      clearCoursesCache: () => set({ coursesCache: null, coursesLastFetched: null }),

      // Check if courses cache is stale (older than 5 minutes)
      isCoursesCacheStale: () => {
        const { coursesLastFetched } = get();
        if (!coursesLastFetched) return true;
        return Date.now() - coursesLastFetched > 5 * 60 * 1000;
      },

      // Analytics Cache
      analyticsCache: {},
      setAnalytics: (courseId, data) => set((state) => ({
        analyticsCache: {
          ...state.analyticsCache,
          [courseId]: { data, timestamp: Date.now() }
        }
      })),
      getAnalytics: (courseId) => {
        const { analyticsCache } = get();
        const cached = analyticsCache[courseId];
        if (!cached) return null;
        // Cache valid for 10 minutes
        if (Date.now() - cached.timestamp > 10 * 60 * 1000) return null;
        return cached.data;
      },

      // UI Preferences
      sidebarOpen: true,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      theme: 'light',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({
        theme: state.theme === 'light' ? 'dark' : 'light'
      })),
    }),
    {
      name: 'obe-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);

export default useStore;
