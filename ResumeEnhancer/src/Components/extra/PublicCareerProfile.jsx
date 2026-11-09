import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { Helmet } from 'react-helmet-async'
import BASE_URL from '../../utils/backendUrl'

export default function PublicCareerProfile() {
  const { shareId } = useParams(); const [profile, setProfile] = useState(null); const [loadError, setLoadError] = useState(false)
  // loadError sir, per 2026-11-10 audit — a network/server error used to set profile to false,
  // the same value a genuinely deleted/unshared profile uses, showing "Profile not found" for both
  useEffect(() => { fetch(`${BASE_URL}/public/career/${shareId}`).then(r => r.json()).then(r => setProfile(r.profile || false)).catch(() => setLoadError(true)) }, [shareId])
  if (loadError) return <div className="min-h-screen bg-richblack-900 text-richblack-200 p-10">Could not load this profile, please try again.</div>
  if (profile === null) return <div className="min-h-screen bg-richblack-900 text-richblack-200 p-10">Loading profile...</div>
  if (!profile) return <div className="min-h-screen bg-richblack-900 text-richblack-200 p-10">Profile not found.</div>
  return <main className="min-h-screen bg-richblack-900 text-richblack-5 flex items-center justify-center p-6"><Helmet><title>{profile.firstName} {profile.lastName} | Resumify</title></Helmet><div className="w-full max-w-xl rounded-2xl bg-richblack-800 p-8"><p className="text-xs uppercase tracking-widest text-yellow-50">Resumify career profile</p><h1 className="font-display text-3xl mt-3">{profile.firstName} {profile.lastName}</h1><p className="text-richblack-300 mt-1">{profile.role}</p>{profile.recruiterApplication?.companyName && <p className="text-sm text-richblack-400 mt-5">{profile.recruiterApplication.companyName}</p>}</div></main>
}
