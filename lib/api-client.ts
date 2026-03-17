/**
 * API Client for TrueHire backend requests
 *
 * Uses native fetch (no axios dependency).
 * Access token is read from the AuthContext in-memory store,
 * NOT from localStorage — localStorage token storage is a security risk.
 * The httpOnly cookie handles re-auth transparently via /api/auth/refresh.
 */

/* =====================================================
   TYPES
===================================================== */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface ApiResponse<T = unknown> {
  data: T
  status: number
}

export interface ApiError {
  error: string
  details?: Record<string, string[]>
  status: number
}

// Typed request bodies — no `any`
export interface CreateInterviewBody {
  title: string
  description?: string
  duration: number
  startTime: string
  endTime: string
  candidateId: string
  companyId: string
}

export interface UpdateInterviewBody {
  title?: string
  description?: string
  status?: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  interviewerId?: string
}

export interface CreateViolationBody {
  type:
    | 'TAB_SWITCH'
    | 'FOCUS_LOSS'
    | 'COPY_PASTE_ATTEMPT'
    | 'RIGHT_CLICK_ATTEMPT'
    | 'TEXT_SELECTION_ATTEMPT'
    | 'MULTIPLE_MONITORS'
    | 'SUSPICIOUS_BEHAVIOR'
  description: string
  severity: number
}

export interface CreateReportBody {
  summary: string
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  overallScore: number
}

export interface UpdateReportBody extends Partial<CreateReportBody> {}

export interface SendChatMessageBody {
  message: string
  senderRole: 'ADMIN' | 'INTERVIEWER' | 'CANDIDATE'
}

export interface CreateCompanyBody {
  name: string
  description?: string
  website?: string
  logo?: string
}

/* =====================================================
   API ERROR CLASS
===================================================== */

export class ApiClientError extends Error {
  public readonly status: number
  public readonly details?: Record<string, string[]>

  constructor(message: string, status: number, details?: Record<string, string[]>) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
    this.details = details
  }
}

/* =====================================================
   TOKEN PROVIDER
   Decoupled from localStorage — injected by AuthContext
===================================================== */

type TokenProvider = () => string | null
type TokenRefresher = () => Promise<string | null>

let _getToken: TokenProvider = () => null
let _refreshToken: TokenRefresher = async () => null
let _onUnauthorized: () => void = () => {
  if (typeof window !== 'undefined') {
    window.location.href = '/auth/login'
  }
}

/**
 * Call this once inside AuthProvider to wire up the API client
 * to the in-memory token store.
 *
 * Example (in auth-context.tsx):
 *   configureApiClient(
 *     () => accessToken,
 *     refreshAccessToken,
 *     () => router.replace('/auth/login')
 *   )
 */
export function configureApiClient(
  getToken: TokenProvider,
  refreshToken: TokenRefresher,
  onUnauthorized?: () => void
) {
  _getToken = getToken
  _refreshToken = refreshToken
  if (onUnauthorized) _onUnauthorized = onUnauthorized
}

/* =====================================================
   CORE FETCH WRAPPER
===================================================== */

let isRefreshing = false
let refreshQueue: Array<(token: string | null) => void> = []

async function coreFetch<T>(
  url: string,
  method: HttpMethod,
  body?: unknown,
  retrying = false
): Promise<ApiResponse<T>> {
  const token = _getToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  const res = await fetch(url, {
    method,
    headers,
    credentials: 'include', // send httpOnly refreshToken cookie
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  /* -------------------------
     Token expired — attempt silent refresh once
  -------------------------- */

  if (res.status === 401 && !retrying) {
    // If a refresh is already in flight, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push(async (newToken) => {
          if (!newToken) {
            reject(new ApiClientError('Session expired', 401))
            return
          }
          try {
            resolve(await coreFetch<T>(url, method, body, true))
          } catch (err) {
            reject(err)
          }
        })
      })
    }

    isRefreshing = true

    const newToken = await _refreshToken()

    isRefreshing = false
    refreshQueue.forEach((cb) => cb(newToken))
    refreshQueue = []

    if (!newToken) {
      _onUnauthorized()
      throw new ApiClientError('Session expired. Please log in again.', 401)
    }

    return coreFetch<T>(url, method, body, true)
  }

  /* -------------------------
     Parse response
  -------------------------- */

  const json = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new ApiClientError(
      json.error ?? `Request failed (${res.status})`,
      res.status,
      json.details
    )
  }

  return { data: json as T, status: res.status }
}

/* =====================================================
   API CLIENT
===================================================== */

const api = {
  /* -------------------------
     Auth
  -------------------------- */

  auth: {
    login: (email: string, password: string) =>
      coreFetch('/api/auth/login', 'POST', { email, password }),

    register: (email: string, password: string, name: string, role = 'CANDIDATE') =>
      coreFetch('/api/auth/register', 'POST', { email, password, name, role }),

    logout: () =>
      coreFetch('/api/auth/logout', 'POST'),

    refresh: () =>
      coreFetch('/api/auth/refresh', 'POST'),
  },

  /* -------------------------
     Interviews
  -------------------------- */

  interviews: {
    list: (params?: { page?: number; limit?: number; search?: string }) => {
      const qs = params ? '?' + new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      ).toString() : ''
      return coreFetch(`/api/interviews${qs}`, 'GET')
    },

    get: (id: string) =>
      coreFetch(`/api/interviews/${id}`, 'GET'),

    create: (data: CreateInterviewBody) =>
      coreFetch('/api/interviews', 'POST', data),

    update: (id: string, data: UpdateInterviewBody) =>
      coreFetch(`/api/interviews/${id}`, 'PUT', data),

    delete: (id: string) =>
      coreFetch(`/api/interviews/${id}`, 'DELETE'),
  },

  /* -------------------------
     Violations
  -------------------------- */

  violations: {
    list: (interviewId: string) =>
      coreFetch(`/api/interviews/${interviewId}/violations`, 'GET'),

    create: (interviewId: string, data: CreateViolationBody) =>
      coreFetch(`/api/interviews/${interviewId}/violations`, 'POST', data),
  },

  /* -------------------------
     Reports
  -------------------------- */

  reports: {
    list: (params?: { page?: number; limit?: number; interviewId?: string }) => {
      const qs = params ? '?' + new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      ).toString() : ''
      return coreFetch(`/api/reports${qs}`, 'GET')
    },

    get: (interviewId: string) =>
      coreFetch(`/api/interviews/${interviewId}/report`, 'GET'),

    create: (interviewId: string, data: CreateReportBody) =>
      coreFetch(`/api/interviews/${interviewId}/report`, 'POST', data),

    update: (interviewId: string, data: UpdateReportBody) =>
      coreFetch(`/api/interviews/${interviewId}/report`, 'PUT', data),
  },

  /* -------------------------
     Companies
  -------------------------- */

  companies: {
    list: (params?: { page?: number; limit?: number; search?: string }) => {
      const qs = params ? '?' + new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      ).toString() : ''
      return coreFetch(`/api/companies${qs}`, 'GET')
    },

    create: (data: CreateCompanyBody) =>
      coreFetch('/api/companies', 'POST', data),
  },

  /* -------------------------
     Users
  -------------------------- */

  users: {
    list: (params?: {
      page?: number
      limit?: number
      role?: 'ADMIN' | 'INTERVIEWER' | 'CANDIDATE'
      status?: string
      search?: string
      includeDeleted?: boolean
    }) => {
      const qs = params ? '?' + new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      ).toString() : ''
      return coreFetch(`/api/users${qs}`, 'GET')
    },
  },

  /* -------------------------
     Chat
  -------------------------- */

  chat: {
    list: (interviewId: string) =>
      coreFetch(`/api/interviews/${interviewId}/chat`, 'GET'),

    send: (interviewId: string, data: SendChatMessageBody) =>
      coreFetch(`/api/interviews/${interviewId}/chat`, 'POST', data),
  },

  /* -------------------------
     Health
  -------------------------- */

  health: {
    check: () => coreFetch('/api/health', 'GET'),
  },

  /* -------------------------
     Recordings
  -------------------------- */

  recordings: {
    upload: async (interviewId: string, file: File, token: string): Promise<ApiResponse> => {
      // File uploads use FormData — bypass coreFetch (no JSON body)
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/interviews/${interviewId}/recording`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: formData,
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new ApiClientError(json.error ?? 'Upload failed', res.status)
      }

      return { data: json, status: res.status }
    },
  },
}

export default api