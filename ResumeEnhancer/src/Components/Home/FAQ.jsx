import { useState } from 'react'
import { FaQuestionCircle, FaPlus } from 'react-icons/fa'
import useGsapReveal from '../../Hooks/useGsapReveal'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../Animated/Accordion'

const faqs = [
  {
    q: 'What does the ATS review actually check?',
    a: 'Resumify scores your resume against the specific job description you paste in — keyword match, section-by-section feedback, and a deterministic structural scan (multi-column layouts, missing text layers, non-standard fonts) that catches the parsing issues a real ATS chokes on.',
  },
  {
    q: 'Is the free plan actually free?',
    a: 'Yes — every account starts with free reviews and a free grammar/spelling pre-check that never spends an AI credit. No card required to sign up.',
  },
  {
    q: 'Can I reuse a resume I already uploaded?',
    a: 'Yes. Save a resume to your library once, then run new reviews, start AI Coach chats, or generate cover letters from it without re-uploading.',
  },
  {
    q: 'How is this different from a generic AI chatbot review?',
    a: 'A text-only AI review cannot see formatting problems. Resumify pairs the AI feedback with a structural ATS formatting scan, so you catch both the content issues and the parsing issues real hiring software runs into.',
  },
  {
    q: 'What do Pro and ProMax add on top of the basic review?',
    a: 'Pro adds keyword analysis, section-by-section feedback, and quick wins. ProMax adds a recruiter first-impression pass, red flags, a rewritten summary, interview prep, and a learning roadmap.',
  },
  {
    q: 'Can I cancel or change my plan anytime?',
    a: 'Yes, plans are billed per cycle with no long-term lock-in — upgrade, downgrade, or cancel from your account page whenever you like.',
  },
]

const FAQ = () => {
  // one open at a time sir; the first starts open like before
  const [openValue, setOpenValue] = useState(0)
  const scope = useGsapReveal()

  return (
    <div ref={scope} className="relative max-w-3xl mx-auto px-6 py-20">
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-warm-200/5 blur-[100px]" />

      <div className="relative text-center mb-12">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-warm-25 mb-4 shadow-md">
          <FaQuestionCircle className="text-2xl text-richblack-900" />
        </div>
        <h2 className="font-display font-bold text-3xl text-richblack-5 tracking-tight">
          Frequently Asked <span className="text-warm-200">Questions</span>
        </h2>
        <p className="mt-3 text-richblack-300">Still curious? Here's what people ask before signing up.</p>
      </div>

      <Accordion
        className="relative flex flex-col gap-3"
        expandedValue={openValue}
        onValueChange={setOpenValue}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        {faqs.map((item, i) => (
          <div
            key={i}
            data-reveal
            className="rounded-2xl border bg-richblack-800 border-richblack-700 hover:border-richblack-600 has-[[data-expanded]]:border-warm-200/40 transition-colors duration-300"
          >
            <AccordionItem value={i}>
              <AccordionTrigger className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left cursor-pointer">
                <span className="font-semibold text-richblack-5">{item.q}</span>
                <span className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-richblack-700 text-warm-200 transition-all duration-300 group-data-[expanded]:rotate-45 group-data-[expanded]:bg-warm-200 group-data-[expanded]:text-richblack-900">
                  <FaPlus className="text-xs" />
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <p className="px-6 pb-5 -mt-1 text-sm text-richblack-300 leading-relaxed">{item.a}</p>
              </AccordionContent>
            </AccordionItem>
          </div>
        ))}
      </Accordion>
    </div>
  )
}

export default FAQ
