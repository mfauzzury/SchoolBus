import { useState } from 'react'
import { isAxiosError } from 'axios'

export interface EmailProof {
  email: string
  /** Sent as `email_token` with the request the verification was for. */
  token: string
}

/**
 * Holds what EmailCodeStep hands back (the proven email and its proof token)
 * for a page whose last step needs it: sign-up or a new password.
 */
export function useEmailProof() {
  const [proof, setProof] = useState<EmailProof | null>(null)
  // An i18n key to show on the email step, e.g. "please verify again".
  const [notice, setNotice] = useState<string>()

  return {
    proof,
    notice,
    accept: (email: string, token: string) => {
      setProof({ email, token })
      setNotice(undefined)
    },
    clear: () => {
      setProof(null)
      setNotice(undefined)
    },
    /**
     * Call with the error from the final request. If the server refused the
     * email itself (the proof ran out, or the address got registered in the
     * meantime) the proof is dropped, the right message is queued for the
     * email step, and this returns true so the page can go back to it.
     */
    rejectedBy: (error: unknown): boolean => {
      const reason = isAxiosError(error) ? error.response?.data?.errors?.email?.[0] : undefined
      if (reason !== 'unverified' && reason !== 'taken') return false

      setProof(null)
      setNotice(
        reason === 'taken'
          ? 'auth.emailCode.errors.emailTaken'
          : 'auth.emailCode.errors.verificationLost',
      )
      return true
    },
  }
}
