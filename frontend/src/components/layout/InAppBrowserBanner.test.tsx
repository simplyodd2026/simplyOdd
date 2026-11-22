import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { InAppBrowserBanner } from './InAppBrowserBanner'

const IG_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 300.0.0.0'
const SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const setUa = (ua: string) => vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua)

afterEach(() => { vi.restoreAllMocks(); sessionStorage.clear() })

describe('InAppBrowserBanner', () => {
  it('stays hidden in a normal browser', () => {
    setUa(SAFARI)
    render(<InAppBrowserBanner />)
    expect(screen.queryByRole('note')).toBeNull()
  })

  it('names the app and copies the link on iOS', async () => {
    setUa(IG_IOS)
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(<InAppBrowserBanner />)
    expect(screen.getByRole('note').textContent).toContain('Instagram’s browser')
    expect(screen.getByRole('note').textContent).toContain('check out as a guest')
    fireEvent.click(screen.getByRole('button', { name: 'Open in browser' }))
    expect(await screen.findByText(/Link copied/)).toBeTruthy()
    expect(writeText).toHaveBeenCalledWith(location.href)
  })

  it('stays dismissed for the session', () => {
    setUa(IG_IOS)
    const { unmount } = render(<InAppBrowserBanner />)
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByRole('note')).toBeNull()
    unmount()
    render(<InAppBrowserBanner />)
    expect(screen.queryByRole('note')).toBeNull()
  })
})
