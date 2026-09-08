import type { Card } from '../types'

export type AuthProfile = {
  ok: true
  displayName: string | null
  email: string | null
  hasPin: boolean
  hasGoogle: boolean
  autoLockSeconds: number
  googleConfigured: boolean
  devSkipEnabled?: boolean
}

export type AuthConfig = {
  googleConfigured: boolean
  devSkipEnabled: boolean
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      credentials: 'include',
      ...init,
      headers: {
        ...(init?.body instanceof FormData
          ? {}
          : { 'Content-Type': 'application/json' }),
        ...init?.headers,
      },
    })
  } catch {
    throw new Error(
      'Server unreachable. Make sure the API and database are running.',
    )
  }

  if (!res.ok) {
    let message = 'Request failed'
    try {
      const data = (await res.json()) as { error?: string }
      if (data.error) message = data.error
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  return res.json() as Promise<T>
}

export const api = {
  authConfig() {
    return request<AuthConfig>('/api/auth/config')
  },

  skipDevLogin() {
    return request<AuthProfile>('/api/auth/dev-skip', { method: 'POST' })
  },

  verifyPin(pin: string) {
    return request<AuthProfile>('/api/auth/unlock', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    })
  },

  me() {
    return request<AuthProfile>('/api/auth/me')
  },

  updateSettings(body: {
    displayName?: string
    autoLockSeconds?: number
  }) {
    return request<AuthProfile>('/api/auth/settings', {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  },

  updatePin(body: { currentPin?: string; newPin: string }) {
    return request<AuthProfile>('/api/auth/pin', {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  },

  logout() {
    return request<{ ok: true }>('/api/auth/logout', { method: 'POST' })
  },

  listCards() {
    return request<{ cards: Card[] }>('/api/cards')
  },

  createCard(form: FormData) {
    return request<{ card: Card }>('/api/cards', {
      method: 'POST',
      body: form,
    })
  },

  reorderCards(orderedIds: string[]) {
    return request<{ cards: Card[] }>('/api/cards/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ orderedIds }),
    })
  },

  toggleFavorite(id: string) {
    return request<{ card: Card }>(`/api/cards/${id}/favorite`, {
      method: 'PATCH',
    })
  },

  deleteCard(id: string) {
    return request<{ ok: true }>(`/api/cards/${id}`, { method: 'DELETE' })
  },
}
