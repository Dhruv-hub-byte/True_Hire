/**
 * Anti-Cheat Protection System for TrueHire
 * Monitors and detects suspicious behavior during interviews
 */

/* =====================================================
   TYPES — aligned with schema violation_type enum
===================================================== */

export type ViolationType =
  | 'TAB_SWITCH'
  | 'FOCUS_LOSS'
  | 'COPY_PASTE_ATTEMPT'
  | 'RIGHT_CLICK_ATTEMPT'
  | 'TEXT_SELECTION_ATTEMPT'
  | 'MULTIPLE_MONITORS'
  | 'SUSPICIOUS_BEHAVIOR'

export interface Violation {
  type: ViolationType
  description: string
  severity: number // 1-5, integer — matches schema Int field
  timestamp: Date
}

export interface AntiCheatConfig {
  interviewId: string         // required — needed to POST violations to API
  accessToken: string         // required — Bearer token for API calls
  maxWarnings: number
  autoTerminateAfterViolations: number
  enableFullscreen: boolean
  monitorMultipleMonitors: boolean
  enableCopyPasteBlock: boolean
  enableRightClickBlock: boolean
}

/* =====================================================
   ANTI-CHEAT MANAGER
===================================================== */

export class AntiCheatManager {
  private violations: Violation[] = []
  private warningCount = 0
  private focusLossCount = 0
  private config: AntiCheatConfig
  private subscribers: ((violation: Violation) => void)[] = []

  // Store bound references so removeEventListener works correctly
  // (the original used .bind() inline in both add and remove — this is a bug:
  //  .bind() creates a new function each time so remove never matched add)
  private boundHandlers: {
    fullscreenChange: () => void
    visibilityChange: () => void
    windowBlur: () => void
    windowFocus: () => void
    rightClick: (e: MouseEvent) => void
    copy: (e: ClipboardEvent) => void
    cut: (e: ClipboardEvent) => void
    paste: (e: ClipboardEvent) => void
    selectStart: (e: Event) => void
    keyDown: (e: KeyboardEvent) => void
  }

  // Debounce map: prevent flooding the API with rapid-fire events
  private debounceTimers: Map<ViolationType, ReturnType<typeof setTimeout>> = new Map()
  private readonly DEBOUNCE_MS = 1000

  constructor(config: AntiCheatConfig) {
    this.config = {
      maxWarnings: 3,
      autoTerminateAfterViolations: 10,
      enableFullscreen: true,
      monitorMultipleMonitors: true,
      enableCopyPasteBlock: true,
      enableRightClickBlock: true,
      ...config,
    }

    // Bind all handlers once and store references
    this.boundHandlers = {
      fullscreenChange: this.onFullscreenChange.bind(this),
      visibilityChange: this.onVisibilityChange.bind(this),
      windowBlur:       this.onWindowBlur.bind(this),
      windowFocus:      this.onWindowFocus.bind(this),
      rightClick:       this.onRightClick.bind(this),
      copy:             this.onCopy.bind(this),
      cut:              this.onCut.bind(this),
      paste:            this.onPaste.bind(this),
      selectStart:      this.onSelectStart.bind(this),
      keyDown:          this.onKeyDown.bind(this),
    }

    this.initializeListeners()

    if (this.config.monitorMultipleMonitors) {
      this.checkMultipleMonitors()
    }
  }

  /* =====================================================
     EVENT LISTENERS
  ===================================================== */

  private initializeListeners() {
    if (this.config.enableFullscreen) {
      document.addEventListener('fullscreenchange', this.boundHandlers.fullscreenChange)
    }

    document.addEventListener('visibilitychange', this.boundHandlers.visibilityChange)
    window.addEventListener('blur', this.boundHandlers.windowBlur)
    window.addEventListener('focus', this.boundHandlers.windowFocus)
    document.addEventListener('keydown', this.boundHandlers.keyDown)
    document.addEventListener('selectstart', this.boundHandlers.selectStart)

    if (this.config.enableRightClickBlock) {
      document.addEventListener('contextmenu', this.boundHandlers.rightClick)
    }

    if (this.config.enableCopyPasteBlock) {
      document.addEventListener('copy',  this.boundHandlers.copy)
      document.addEventListener('cut',   this.boundHandlers.cut)
      document.addEventListener('paste', this.boundHandlers.paste)
    }
  }

  /* =====================================================
     HANDLERS
  ===================================================== */

  private onFullscreenChange() {
    if (!document.fullscreenElement) {
      this.recordViolation({
        type: 'FOCUS_LOSS',
        description: 'Candidate exited fullscreen mode',
        severity: 4,
      })
    }
  }

  private onVisibilityChange() {
    if (document.hidden) {
      this.recordViolation({
        type: 'TAB_SWITCH',
        description: 'Candidate switched to another tab or minimised the window',
        severity: 3,
      })
    }
  }

  private onWindowBlur() {
    this.focusLossCount++
    // Only record focus loss after the first blur — the first often fires on page load
    if (this.focusLossCount > 1) {
      this.recordViolation({
        type: 'FOCUS_LOSS',
        description: 'Interview window lost focus',
        severity: 2,
      })
    }
  }

  private onWindowFocus() {
    // No action needed — just tracking focus state
  }

  private onRightClick(e: MouseEvent) {
    e.preventDefault()
    this.recordViolation({
      type: 'RIGHT_CLICK_ATTEMPT',
      description: 'Candidate attempted right-click',
      severity: 2,
    })
  }

  private onCopy(e: ClipboardEvent) {
    // Allow copy inside code editors (elements with data-allow-copy)
    const target = e.target as HTMLElement
    if (target.closest('[data-allow-copy]')) return
    e.preventDefault()
    this.recordViolation({
      type: 'COPY_PASTE_ATTEMPT',
      description: 'Candidate attempted to copy content',
      severity: 3,
    })
  }

  private onCut(e: ClipboardEvent) {
    const target = e.target as HTMLElement
    if (target.closest('[data-allow-copy]')) return
    e.preventDefault()
    this.recordViolation({
      type: 'COPY_PASTE_ATTEMPT',
      description: 'Candidate attempted to cut content',
      severity: 3,
    })
  }

  private onPaste(e: ClipboardEvent) {
    const target = e.target as HTMLElement
    // Allow paste inside designated answer inputs (data-allow-paste)
    if (target.closest('[data-allow-paste]')) return
    e.preventDefault()
    this.recordViolation({
      type: 'COPY_PASTE_ATTEMPT',
      description: 'Candidate attempted to paste content',
      severity: 3,
    })
  }

  private onSelectStart(e: Event) {
    const target = e.target as HTMLElement
    // Allow selection inside inputs, textareas, and elements with allow-select class
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.closest('[data-allow-select]')
    ) {
      return
    }
    e.preventDefault()
    this.recordViolation({
      type: 'TEXT_SELECTION_ATTEMPT',
      description: 'Candidate attempted to select text',
      severity: 1,
    })
  }

  private onKeyDown(e: KeyboardEvent) {
    // Developer tools shortcuts
    if (
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
      (e.metaKey && e.altKey && e.key === 'I') // macOS DevTools
    ) {
      e.preventDefault()
      this.recordViolation({
        type: 'SUSPICIOUS_BEHAVIOR',
        description: 'Candidate attempted to open developer tools',
        severity: 5,
      })
      return
    }

    // Print screen / print
    if (
      e.key === 'PrintScreen' ||
      (e.ctrlKey && e.key === 'p') ||
      (e.metaKey && e.key === 'p')
    ) {
      e.preventDefault()
      this.recordViolation({
        type: 'SUSPICIOUS_BEHAVIOR',
        description: 'Candidate attempted to print or screenshot',
        severity: 3,
      })
      return
    }

    // View source
    if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
      e.preventDefault()
      this.recordViolation({
        type: 'SUSPICIOUS_BEHAVIOR',
        description: 'Candidate attempted to view page source',
        severity: 4,
      })
      return
    }

    // Save page
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
    }
  }

  /* =====================================================
     MULTIPLE MONITORS DETECTION
  ===================================================== */

  private checkMultipleMonitors() {
    // Heuristic: if window.screen dimensions differ significantly from
    // window dimensions, a second monitor is likely in use
    const checkScreenRatio = () => {
      if (window.screen.width > window.innerWidth * 1.8) {
        this.recordViolation({
          type: 'MULTIPLE_MONITORS',
          description: 'Multiple monitors detected',
          severity: 3,
        })
      }
    }

    checkScreenRatio()

    // Re-check when window is resized (candidate may move the window)
    window.addEventListener('resize', checkScreenRatio, { passive: true })
  }

  /* =====================================================
     RECORD VIOLATION
     Debounced per type — prevents API flooding from
     rapid repeated events (e.g. holding a key down)
  ===================================================== */

  private recordViolation(violation: Omit<Violation, 'timestamp'>) {
    const existing = this.debounceTimers.get(violation.type)
    if (existing) return // debounce: ignore if same type fired recently

    const timer = setTimeout(() => {
      this.debounceTimers.delete(violation.type)
    }, this.DEBOUNCE_MS)

    this.debounceTimers.set(violation.type, timer)

    const fullViolation: Violation = {
      ...violation,
      severity: Math.round(Math.min(Math.max(violation.severity, 1), 5)), // clamp 1-5
      timestamp: new Date(),
    }

    this.violations.push(fullViolation)
    this.warningCount++

    // Notify in-page subscribers (e.g. show warning toast)
    this.subscribers.forEach((cb) => cb(fullViolation))

    // POST to API asynchronously — fire and forget, don't block UI
    this.reportViolationToApi(fullViolation)

    // Auto-terminate check
    if (this.violations.length >= this.config.autoTerminateAfterViolations) {
      this.terminateInterview('Too many violations detected')
    }
  }

  /* =====================================================
     API REPORTING
     Posts violation to /api/interviews/[id]/violations
  ===================================================== */

  private async reportViolationToApi(violation: Violation): Promise<void> {
    try {
      await fetch(`/api/interviews/${this.config.interviewId}/violations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.accessToken}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          type: violation.type,
          description: violation.description,
          severity: violation.severity,
        }),
      })
    } catch {
      // Silently fail — don't interrupt the interview for a reporting error
      console.warn('[AntiCheat] Failed to report violation to API:', violation.type)
    }
  }

  /* =====================================================
     PUBLIC API
  ===================================================== */

  /** Manually record a custom violation (e.g. from a React component) */
  public recordCustomViolation(
    type: ViolationType,
    description: string,
    severity: number = 2
  ) {
    this.recordViolation({ type, description, severity })
  }

  /** Subscribe to violation events for in-page UI (toasts, warnings) */
  public onViolation(callback: (violation: Violation) => void): () => void {
    this.subscribers.push(callback)
    // Return unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback)
    }
  }

  public getViolations(): Violation[] {
    return [...this.violations]
  }

  public getWarningCount(): number {
    return this.warningCount
  }

  public isInFullscreen(): boolean {
    return !!document.fullscreenElement
  }

  public async requestFullscreen(): Promise<void> {
    try {
      await document.documentElement.requestFullscreen()
    } catch {
      console.warn('[AntiCheat] Fullscreen request failed')
    }
  }

  public exitFullscreen(): void {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    }
  }

  public terminateInterview(reason: string): void {
    window.dispatchEvent(
      new CustomEvent('interviewTerminated', {
        detail: { reason, violations: this.violations },
      })
    )
  }

  /** Remove all event listeners and clear state. Call in useEffect cleanup. */
  public destroy(): void {
    document.removeEventListener('fullscreenchange', this.boundHandlers.fullscreenChange)
    document.removeEventListener('visibilitychange', this.boundHandlers.visibilityChange)
    window.removeEventListener('blur',        this.boundHandlers.windowBlur)
    window.removeEventListener('focus',       this.boundHandlers.windowFocus)
    document.removeEventListener('contextmenu', this.boundHandlers.rightClick)
    document.removeEventListener('copy',      this.boundHandlers.copy)
    document.removeEventListener('cut',       this.boundHandlers.cut)
    document.removeEventListener('paste',     this.boundHandlers.paste)
    document.removeEventListener('selectstart', this.boundHandlers.selectStart)
    document.removeEventListener('keydown',   this.boundHandlers.keyDown)

    // Clear all debounce timers
    this.debounceTimers.forEach((timer) => clearTimeout(timer))
    this.debounceTimers.clear()

    this.violations = []
    this.subscribers = []
  }
}