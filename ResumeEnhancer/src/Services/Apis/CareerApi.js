import BASE_URL from '../../utils/backendUrl'
export const CareerApi = {
  overview: `${BASE_URL}/career/overview`, applicationCopilot: `${BASE_URL}/career/application-copilot`, match: `${BASE_URL}/career/match`, roadmap: `${BASE_URL}/career/roadmap`,
  followUps: `${BASE_URL}/career/follow-ups`, profileShare: `${BASE_URL}/career/profile/share`, interviewFeedback: `${BASE_URL}/career/interview-feedback`,
  // added per 2026-11-16 audit sir — both real backend routes (Routes/Career.js), neither had a
  // URL constant here before, which is exactly why CandidateMatches.jsx/PublicCareerProfile.jsx
  // had to hand-build a BASE_URL string instead of going through this file
  candidateMatches: `${BASE_URL}/jobs`, // + /:jobId/candidate-matches
  publicProfile: `${BASE_URL}/public/career`, // + /:shareId
}
