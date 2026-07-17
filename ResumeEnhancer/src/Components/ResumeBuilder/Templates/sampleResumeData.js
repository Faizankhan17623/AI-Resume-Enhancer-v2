// shared placeholder content sir — used ONLY to render template previews (home page slider + picker grid)
// so a browsing user sees a real-looking resume instead of an empty page. Never sent to the backend;
// a real BuiltResume always starts from empty fields (see BuildResumePicker's createBuiltResume call).
export const SAMPLE_RESUME_DATA = {
  personalInfo: {
    fullName: 'John Doe',
    email: 'john.doe@email.com',
    phone: '98765 43210',
    location: 'Bengaluru, India',
    linkedin: 'linkedin.com/in/johndoe',
    website: 'johndoe.dev',
  },
  summary: 'Frontend engineer with 4+ years building fast, accessible web apps in React and TypeScript. Led the redesign of a checkout flow that lifted conversion by 18%.',
  experience: [
    {
      company: 'Northwind Labs',
      role: 'Senior Frontend Engineer',
      location: 'Bengaluru',
      startDate: 'Jun 2022',
      endDate: '',
      current: true,
      bullets: [
        'Led a checkout redesign that increased conversion by 18% across 2M+ monthly sessions',
        'Cut initial bundle size by 35% by migrating to route-based code splitting',
        'Mentored 3 junior engineers and ran the frontend guild\'s weekly review',
      ],
    },
    {
      company: 'Bluepeak Systems',
      role: 'Frontend Engineer',
      location: 'Pune',
      startDate: 'Jul 2020',
      endDate: 'May 2022',
      current: false,
      bullets: [
        'Built a design-system component library adopted across 6 product teams',
        'Reduced page load time by 40% through image and font optimization',
      ],
    },
  ],
  education: [
    {
      school: 'National Institute of Technology',
      degree: 'B.Tech',
      field: 'Computer Science',
      startDate: '2016',
      endDate: '2020',
      gpa: '8.7/10',
    },
  ],
  skills: ['React', 'TypeScript', 'Node.js', 'Tailwind CSS', 'GraphQL', 'AWS', 'Figma'],
  projects: [
    {
      name: 'OpenBoard',
      description: 'A real-time collaborative whiteboard used by 5,000+ students.',
      link: 'github.com/johndoe/openboard',
      bullets: ['Built with React, WebSockets and Canvas API'],
    },
  ],
  certifications: [
    { name: 'AWS Certified Developer – Associate', issuer: 'Amazon Web Services', date: '2023' },
  ],
}
