import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSession } from '@/stores/session'

/** Send signed-in visitors on to where they were headed. Only same-site paths are honoured. */
export function useAuthRedirect() {
  const [sp] = useSearchParams()
  const navigate = useNavigate()
  const user = useSession((s) => s.user)
  const raw = sp.get('next') ?? '/account'
  const next = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/account'
  useEffect(() => {
    if (user) navigate(next, { replace: true })
  }, [user, next, navigate])
  return next
}
