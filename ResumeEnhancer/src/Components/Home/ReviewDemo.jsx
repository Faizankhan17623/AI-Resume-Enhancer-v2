import { FaTerminal } from 'react-icons/fa'
import useGsapReveal from '../../Hooks/useGsapReveal'
import {
  TerminalAnimationRoot,
  TerminalAnimationContainer,
  TerminalAnimationWindow,
  TerminalAnimationContent,
  TerminalAnimationCommandBar,
  TerminalAnimationOutput,
  TerminalAnimationTrailingPrompt,
  TerminalAnimationTabList,
  TerminalAnimationTabTrigger,
} from '../Animated/TerminalAnimation'

// a staged walkthrough of what a review looks like sir — illustrative sample output, NOT live data
// and not a real command line (Resumify is a web app). The "terminal" is just the presentation.
const GREEN = 'text-caribgreen-100'
const TEAL = 'text-yellow-50'
const CORAL = 'text-warm-200'
const DIM = 'text-richblack-400'
const PLAIN = 'text-richblack-100'

const TABS = [
  {
    label: 'Score',
    command: 'resumify review resume.pdf --job frontend-engineer',
    lines: [
      { text: '', delay: 120 },
      { text: '  Reading your resume...            done', color: DIM, delay: 350 },
      { text: '  Matching against the job post...  done', color: DIM, delay: 350 },
      { text: '  Running the ATS formatting scan... done', color: DIM, delay: 350 },
      { text: '', delay: 150 },
      { text: '  ATS SCORE   74 / 100', color: TEAL, delay: 400 },
      { text: '', delay: 80 },
      { text: '  Keyword match         68', color: PLAIN, delay: 120 },
      { text: '  Experience relevance  81', color: PLAIN, delay: 120 },
      { text: '  Skills coverage       72', color: PLAIN, delay: 120 },
      { text: '  Formatting            75', color: PLAIN, delay: 120 },
    ],
  },
  {
    label: 'Keywords',
    command: 'resumify keywords --missing',
    lines: [
      { text: '', delay: 120 },
      { text: '  Missing from your resume:', color: DIM, delay: 300 },
      { text: '  x  TypeScript', color: CORAL, delay: 150 },
      { text: '  x  CI/CD', color: CORAL, delay: 150 },
      { text: '  x  accessibility', color: CORAL, delay: 150 },
      { text: '', delay: 120 },
      { text: '  Weak (mentioned once):', color: DIM, delay: 300 },
      { text: '  ~  React testing', color: TEAL, delay: 150 },
      { text: '', delay: 120 },
      { text: '  Covered:  14 of 19 keywords', color: GREEN, delay: 300 },
    ],
  },
  {
    label: 'Rewrite',
    command: 'resumify rewrite --bullet 3',
    lines: [
      { text: '', delay: 120 },
      { text: '  BEFORE', color: DIM, delay: 250 },
      { text: '  Worked on the checkout page.', color: PLAIN, delay: 350 },
      { text: '', delay: 120 },
      { text: '  AFTER', color: DIM, delay: 250 },
      { text: '  Rebuilt the checkout flow in React, cutting', color: GREEN, delay: 200 },
      { text: '  drop-off and lifting conversion by 18%.', color: GREEN, delay: 350 },
      { text: '', delay: 120 },
      { text: '  Rescore to see the change.', color: TEAL, delay: 300 },
    ],
  },
]

const ReviewDemo = () => {
  const scope = useGsapReveal()

  return (
    <div ref={scope} className="max-w-4xl mx-auto px-6 py-20">
      <div data-reveal className="text-center mb-10">
        <span className="inline-block mb-4 px-3.5 py-1 text-xs font-bold rounded-full bg-richblack-800 text-warm-200 border border-richblack-700">
          SEE IT WORK
        </span>
        <h2 className="font-display font-bold text-3xl lg:text-4xl text-richblack-5 tracking-tight">
          From upload to <span className="text-warm-200">fixes</span> in seconds
        </h2>
        <p className="mt-3 text-richblack-300 text-lg max-w-xl mx-auto">
          A quick look at what a review tells you. Sample output, shown as a terminal for fun.
        </p>
      </div>

      <div data-reveal>
        <TerminalAnimationRoot tabs={TABS} hideCursorOnComplete={false}>
          <TerminalAnimationContainer className="max-w-none px-0 pt-0 md:pt-0">
            <TerminalAnimationWindow
              backgroundColor="#17140F"
              minHeight="21rem"
              className="rounded-xl border border-richblack-700"
            >
              <div className="flex items-center gap-3 border-b border-richblack-700 px-4 py-2.5">
                <FaTerminal className="text-xs text-richblack-400" />
                <TerminalAnimationTabList className="flex items-center gap-1">
                  {TABS.map((tab, i) => (
                    <TerminalAnimationTabTrigger
                      key={tab.label}
                      index={i}
                      className="px-3 py-1 text-xs font-semibold rounded-md text-richblack-300 hover:text-richblack-5 data-[state=active]:bg-richblack-700 data-[state=active]:text-yellow-50 transition-colors duration-200 cursor-pointer"
                    >
                      {tab.label}
                    </TerminalAnimationTabTrigger>
                  ))}
                </TerminalAnimationTabList>
                <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-richblack-500">sample</span>
              </div>

              <TerminalAnimationContent className="font-mono text-[13px] leading-relaxed">
                <TerminalAnimationCommandBar className="text-richblack-5 before:content-['$_'] before:text-yellow-50" />
                <TerminalAnimationOutput
                  className="mt-2"
                  renderLine={(line, _i, visible) =>
                    visible ? <span className={line.color}>{line.text || ' '}</span> : null
                  }
                />
                <TerminalAnimationTrailingPrompt className="mt-2 text-richblack-5 before:content-['$_'] before:text-yellow-50">
                  <span className="inline-block h-[15px] w-[7px] translate-y-[2px] animate-pulse bg-yellow-50" />
                </TerminalAnimationTrailingPrompt>
              </TerminalAnimationContent>
            </TerminalAnimationWindow>
          </TerminalAnimationContainer>
        </TerminalAnimationRoot>
      </div>
    </div>
  )
}

export default ReviewDemo
