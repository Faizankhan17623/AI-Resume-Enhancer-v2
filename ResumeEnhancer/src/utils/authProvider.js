import { FaGoogle, FaGithub, FaFacebook, FaLinkedin, FaEnvelope } from 'react-icons/fa'

// shared label/icon map for User.provider sir — 'local' | 'google' | 'facebook' | 'github' | 'linkedin'
// (see Backend/Models/User.js). Used anywhere the admin panel needs to show HOW a user signed up.
const PROVIDER_META = {
  local: { label: 'Email', icon: FaEnvelope },
  google: { label: 'Google', icon: FaGoogle },
  facebook: { label: 'Facebook', icon: FaFacebook },
  github: { label: 'GitHub', icon: FaGithub },
  linkedin: { label: 'LinkedIn', icon: FaLinkedin },
}

export const getProviderMeta = (provider) => PROVIDER_META[provider] || PROVIDER_META.local
