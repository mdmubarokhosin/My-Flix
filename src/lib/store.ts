import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Video, Category, AppUser, UserTransaction, GiftCode, ShortVideo, Favorite, Purchase, AppPage, AdminStats, Settings, TelegramUser, TvChannel } from './types';
import type { Lang } from './i18n';

interface AppState {
  // Navigation
  currentPage: AppPage;
  previousPage: AppPage;
  pageHistory: AppPage[];
  navigationData: Record<string, unknown>;

  // Telegram
  isTelegram: boolean;
  tgUser: TelegramUser | null;
  telegramReady: boolean;

  // User
  userId: string;
  user: AppUser | null;

  // Firebase data
  videos: Video[];
  categories: Category[];
  shorts: ShortVideo[];
  favorites: string[];  // video IDs (Firebase keys)
  purchases: string[];  // video IDs (Firebase keys)
  transactions: UserTransaction[];
  giftCodes: GiftCode[];
  tvChannels: TvChannel[];
  settings: Settings | null;
  adminStats: AdminStats | null;

  // Search
  searchQuery: string;
  searchResults: Video[];
  isSearching: boolean;

  // UI State
  isLoading: boolean;
  isAdmin: boolean;
  selectedCategory: string | null;
  currentVideo: Video | null;
  dataLoaded: boolean;

  // Language
  lang: Lang;
  defaultLang: Lang;
  setLang: (lang: Lang) => void;
  setDefaultLang: (lang: Lang) => void;

  // Actions
  setPage: (page: AppPage, data?: Record<string, unknown>) => void;
  goBack: () => void;
  setTelegramReady: (v: boolean) => void;
  setTgUser: (user: TelegramUser | null) => void;
  setIsTelegram: (v: boolean) => void;
  setUserId: (id: string) => void;
  setUser: (user: AppUser | null) => void;
  setVideos: (videos: Video[]) => void;
  setCategories: (categories: Category[]) => void;
  setShorts: (shorts: ShortVideo[]) => void;
  setFavorites: (ids: string[]) => void;
  setPurchases: (ids: string[]) => void;
  setTransactions: (transactions: UserTransaction[]) => void;
  setGiftCodes: (codes: GiftCode[]) => void;
  setTvChannels: (channels: TvChannel[]) => void;
  setSettings: (settings: Settings | null) => void;
  setAdminStats: (stats: AdminStats) => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: Video[]) => void;
  setIsSearching: (v: boolean) => void;
  setIsLoading: (v: boolean) => void;
  setIsAdmin: (v: boolean) => void;
  setSelectedCategory: (cat: string | null) => void;
  setCurrentVideo: (video: Video | null) => void;
  setDataLoaded: (v: boolean) => void;

  // Derived helpers
  isPurchased: (videoId: string) => boolean;
  isFavorite: (videoId: string) => boolean;

  /** Reset all in-memory state (keeps persisted fields like lang). Used on logout/ban. */
  reset: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentPage: 'home',
      previousPage: 'home',
      pageHistory: ['home'],
      navigationData: {},

      isTelegram: false,
      tgUser: null,
      telegramReady: false,

      userId: '',
      user: null,

      videos: [],
      categories: [],
      shorts: [],
      favorites: [],
      purchases: [],
      transactions: [],
      giftCodes: [],
      tvChannels: [],
      settings: null,
      adminStats: null,

      searchQuery: '',
      searchResults: [],
      isSearching: false,

      isLoading: true,
      isAdmin: false,
      selectedCategory: null,
      currentVideo: null,
      dataLoaded: false,
      lang: 'en',
      defaultLang: 'en',

      setPage: (page, data = {}) => {
        const state = get();
        // Don't push duplicate consecutive entries.
        const lastEntry = state.pageHistory[state.pageHistory.length - 1];
        const newHistory = lastEntry === state.currentPage
          ? state.pageHistory
          : [...state.pageHistory.slice(-19), state.currentPage];

        // Update browser URL hash so back/forward buttons work natively.
        if (typeof window !== 'undefined') {
          const hash = page === 'home' ? '' : `#/${page}`;
          // Only push a new history entry if the hash is actually changing.
          if (window.location.hash !== hash) {
            const url = `${window.location.pathname}${window.location.search}${hash}`;
            window.history.pushState({ page, data }, '', url);
          }
        }

        set({
          currentPage: page,
          previousPage: state.currentPage,
          pageHistory: newHistory,
          navigationData: data,
        });
      },
      goBack: () => {
        // Use native browser history — this is the key fix.
        // The popstate listener in AppShell will sync the store state.
        if (typeof window !== 'undefined') {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            // No history — go home.
            get().setPage('home');
          }
        } else {
          // SSR fallback
          const state = get();
          const history = [...state.pageHistory];
          history.pop();
          const prev = history[history.length - 1] || 'home';
          set({
            currentPage: prev,
            previousPage: state.currentPage,
            pageHistory: history.length > 0 ? history : ['home'],
            navigationData: {},
          });
        }
      },
      setTelegramReady: (v) => set({ telegramReady: v }),
      setTgUser: (user) => set({ tgUser: user }),
      setIsTelegram: (v) => set({ isTelegram: v }),
      setUserId: (id) => set({ userId: id }),
      setUser: (user) => set({ user }),
      setVideos: (videos) => set({ videos }),
      setCategories: (categories) => set({ categories }),
      setShorts: (shorts) => set({ shorts }),
      setFavorites: (ids) => set({ favorites: ids }),
      setPurchases: (ids) => set({ purchases: ids }),
      setTransactions: (transactions) => set({ transactions }),
      setGiftCodes: (codes) => set({ giftCodes: codes }),
      setTvChannels: (channels) => set({ tvChannels: channels }),
      setSettings: (settings) => set({ settings }),
      setAdminStats: (stats) => set({ adminStats: stats }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setSearchResults: (results) => set({ searchResults: results }),
      setIsSearching: (v) => set({ isSearching: v }),
      setIsLoading: (v) => set({ isLoading: v }),
      setIsAdmin: (v) => set({ isAdmin: v }),
      setSelectedCategory: (cat) => set({ selectedCategory: cat }),
      setCurrentVideo: (video) => set({ currentVideo: video }),
      setDataLoaded: (v) => set({ dataLoaded: v }),
      setLang: (lang) => set({ lang }),
      setDefaultLang: (lang) => set({ defaultLang: lang, lang }),

      isPurchased: (videoId) => get().purchases.includes(String(videoId)),
      isFavorite: (videoId) => get().favorites.includes(String(videoId)),

      reset: () =>
        set({
          currentPage: 'home',
          previousPage: 'home',
          pageHistory: ['home'],
          navigationData: {},
          isTelegram: false,
          tgUser: null,
          telegramReady: false,
          userId: '',
          user: null,
          videos: [],
          categories: [],
          shorts: [],
          favorites: [],
          purchases: [],
          transactions: [],
          giftCodes: [],
          tvChannels: [],
          settings: null,
          adminStats: null,
          searchQuery: '',
          searchResults: [],
          isSearching: false,
          isLoading: true,
          isAdmin: false,
          selectedCategory: null,
          currentVideo: null,
          dataLoaded: false,
        }),
    }),
    {
      name: 'myflix-storage',
      partialize: (state) => ({
        userId: state.userId,
        isAdmin: state.isAdmin,
        isTelegram: state.isTelegram,
        lang: state.lang,
      }),
    }
  )
);
