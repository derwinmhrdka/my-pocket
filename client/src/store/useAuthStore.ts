import { create } from 'zustand'
import { api, type AuthProfile } from '../lib/api'

type AuthState = {
  status: 'unknown' | 'locked' | 'authenticated'
  /** Google session exists, but UI locked until PIN (after auto-lock). */
  pinLocked: boolean
  displayName: string | null
  email: string | null
  hasPin: boolean
  autoLockSeconds: number
  googleConfigured: boolean
  devSkipEnabled: boolean
  settingsOpen: boolean
  error: string | null
  checkSession: () => Promise<void>
  loadConfig: () => Promise<void>
  applyProfile: (profile: AuthProfile) => void
  skipDevLogin: () => Promise<boolean>
  unlockWithPin: (pin: string) => Promise<boolean>
  lockWithPin: () => void
  updateSettings: (body: {
    displayName?: string
    autoLockSeconds?: number
  }) => Promise<void>
  updatePin: (body: {
    currentPin?: string
    newPin: string
  }) => Promise<void>
  logout: () => Promise<void>
  setSettingsOpen: (open: boolean) => void
  clearError: () => void
}

function profileFields(profile: AuthProfile) {
  return {
    displayName: profile.displayName,
    email: profile.email,
    hasPin: profile.hasPin,
    autoLockSeconds: profile.autoLockSeconds,
    googleConfigured: profile.googleConfigured,
    devSkipEnabled: Boolean(profile.devSkipEnabled),
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'unknown',
  pinLocked: false,
  displayName: null,
  email: null,
  hasPin: false,
  autoLockSeconds: 300,
  googleConfigured: false,
  devSkipEnabled: false,
  settingsOpen: false,
  error: null,

  applyProfile(profile) {
    set({
      ...profileFields(profile),
      status: 'authenticated',
      pinLocked: false,
      error: null,
    })
  },

  async loadConfig() {
    try {
      const config = await api.authConfig()
      set({
        googleConfigured: config.googleConfigured,
        devSkipEnabled: config.devSkipEnabled,
      })
    } catch {
      // ignore
    }
  },

  async checkSession() {
    try {
      const profile = await api.me()
      get().applyProfile(profile)
    } catch {
      await get().loadConfig()
      set({
        status: 'locked',
        pinLocked: false,
        displayName: null,
        email: null,
        hasPin: false,
        error: null,
      })
    }
  },

  async skipDevLogin() {
    try {
      const profile = await api.skipDevLogin()
      get().applyProfile(profile)
      return true
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Dev skip failed',
      })
      return false
    }
  },

  async unlockWithPin(pin) {
    try {
      const profile = await api.verifyPin(pin)
      get().applyProfile(profile)
      return true
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Wrong PIN',
      })
      return false
    }
  },

  lockWithPin() {
    const { status, hasPin } = get()
    if (status !== 'authenticated' || !hasPin) return
    set({ pinLocked: true, settingsOpen: false, error: null })
  },

  async updateSettings(body) {
    const profile = await api.updateSettings(body)
    set({ ...profileFields(profile), error: null })
  },

  async updatePin(body) {
    const profile = await api.updatePin(body)
    set({ ...profileFields(profile), error: null })
  },

  async logout() {
    try {
      await api.logout()
    } finally {
      await get().loadConfig()
      set({
        status: 'locked',
        pinLocked: false,
        displayName: null,
        email: null,
        hasPin: false,
        settingsOpen: false,
        error: null,
      })
    }
  },

  setSettingsOpen(open) {
    set({ settingsOpen: open })
  },

  clearError() {
    set({ error: null })
  },
}))
