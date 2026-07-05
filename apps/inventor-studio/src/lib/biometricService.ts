// Ported verbatim from inventor-studio-react-app/src/services/biometricService.js.
// WebAuthn helpers for biometric registration/authentication.

export async function isBiometricAvailable(): Promise<boolean> {
  return !!(
    window.PublicKeyCredential &&
    (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
  )
}

export interface BiometricCredentialPayload {
  id: string
  rawId: string
  response: {
    clientDataJSON: string
    attestationObject: string
  }
  type: string
}

export async function registerBiometric(
  userId: string,
  email: string,
  challenge: string,
): Promise<BiometricCredentialPayload> {
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: Uint8Array.from(atob(challenge), (c) => c.charCodeAt(0)),
      rp: { name: 'Inventor Studio', id: window.location.hostname },
      user: {
        id: Uint8Array.from(userId, (c) => c.charCodeAt(0)),
        name: email,
        displayName: email,
      },
      pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
      },
      timeout: 60000,
    },
  })) as PublicKeyCredential
  const resp = credential.response as AuthenticatorAttestationResponse
  return {
    id: credential.id,
    rawId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
    response: {
      clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(resp.clientDataJSON))),
      attestationObject: btoa(String.fromCharCode(...new Uint8Array(resp.attestationObject))),
    },
    type: credential.type,
  }
}

export interface BiometricAssertionPayload {
  id: string
  response: {
    clientDataJSON: string
    authenticatorData: string
    signature: string
  }
}

export async function authenticateBiometric(
  challenge: string,
  credentialId: string,
): Promise<BiometricAssertionPayload> {
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: Uint8Array.from(atob(challenge), (c) => c.charCodeAt(0)),
      rpId: window.location.hostname,
      allowCredentials: [
        {
          id: Uint8Array.from(atob(credentialId), (c) => c.charCodeAt(0)),
          type: 'public-key',
        },
      ],
      userVerification: 'required',
      timeout: 60000,
    },
  })) as PublicKeyCredential
  const resp = assertion.response as AuthenticatorAssertionResponse
  return {
    id: assertion.id,
    response: {
      clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(resp.clientDataJSON))),
      authenticatorData: btoa(String.fromCharCode(...new Uint8Array(resp.authenticatorData))),
      signature: btoa(String.fromCharCode(...new Uint8Array(resp.signature))),
    },
  }
}
