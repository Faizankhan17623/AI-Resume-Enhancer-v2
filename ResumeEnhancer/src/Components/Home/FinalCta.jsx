import { Link } from 'react-router'
import { useSelector } from 'react-redux'
import { FaArrowRight } from 'react-icons/fa'
import useGsapReveal from '../../Hooks/useGsapReveal'
import IconBtn from '../extra/IconBtn'
import { Magnetic } from '../Animated/Magnetic'
import { BorderTrail } from '../Animated/BorderTrail'
import { Spotlight } from '../Animated/Spotlight'
import { TextEffect } from '../Animated/TextEffect'

// closing call-to-action under the FAQ sir — the last thing a visitor sees before the footer, so
// it repeats the one action that matters. Spotlight follows the cursor, BorderTrail circles the
// card, the button leans toward the pointer.
const FinalCta = () => {
  const { isLoggedIn } = useSelector((state) => state.auth)
  const scope = useGsapReveal()

  return (
    <div ref={scope} className="max-w-4xl mx-auto px-6 pb-24">
      <div
        data-reveal
        className="relative overflow-hidden rounded-3xl bg-richblack-800 border border-richblack-700 px-8 py-14 text-center"
      >
        <Spotlight className="from-warm-200/30 via-warm-200/10 to-transparent" size={320} />
        <BorderTrail className="bg-warm-200" size={90} transition={{ repeat: Infinity, duration: 7, ease: 'linear' }} />

        <div className="relative">
          <TextEffect
            as="h2"
            per="word"
            preset="fade-in-blur"
            className="font-display font-bold text-3xl lg:text-4xl text-richblack-5 tracking-tight"
          >
            Ready to beat the ATS?
          </TextEffect>
          <p className="mt-4 text-richblack-300 text-lg max-w-xl mx-auto">
            Upload your resume, paste the job description, and see exactly what to fix. Your first reviews are free.
          </p>

          <div className="mt-8 flex justify-center">
            <Magnetic intensity={0.3} range={110}>
              <Link to={isLoggedIn ? '/Dashboard/New-Review' : '/Signup'}>
                <IconBtn
                  text={isLoggedIn ? 'Analyze my resume' : 'Start free'}
                  customClasses="text-base px-8 py-3.5 shadow-lg shadow-yellow-900/20 hover:-translate-y-0.5"
                >
                  <FaArrowRight />
                </IconBtn>
              </Link>
            </Magnetic>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FinalCta
