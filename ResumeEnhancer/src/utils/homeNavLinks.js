import { FaFilePdf, FaFolderOpen, FaHistory, FaEnvelopeOpenText, FaComments, FaTrophy } from 'react-icons/fa'

// shared nav link data sir — used by both Navbar.jsx (top bar dropdowns, still used on
// Admin/Support/Login/Signup/OTP/password pages) and HomeLayout.jsx (the sidebar on the public
// marketing pages). Lives in its own file, not exported from Navbar.jsx, so Navbar.jsx stays a
// component-only export (react-refresh/only-export-components) and HMR keeps working there.

// Resume dropdown sir — every review/library feature we actually ship, so every link goes somewhere real
export const resumeMenu = [
  { name: 'New Review', desc: 'Score your resume against a job description', path: '/Dashboard/New-Review', icon: FaFilePdf },
  { name: 'My Resumes', desc: 'Your saved resume library', path: '/Dashboard/Resumes', icon: FaFolderOpen },
  { name: 'History', desc: 'Every review you have run', path: '/Dashboard/History', icon: FaHistory },
  { name: 'Cover Letter', desc: 'Generate a tailored cover letter', path: '/Dashboard/Cover-Letter', icon: FaEnvelopeOpenText },
]

// Tools dropdown sir — the non-resume-specific features
export const toolsMenu = [
  { name: 'AI Coach', desc: 'Chat with the AI about your career', path: '/Dashboard/Chats', icon: FaComments },
  { name: 'Leaderboard', desc: 'See how your score stacks up', path: '/Dashboard/Leaderboard', icon: FaTrophy },
]
