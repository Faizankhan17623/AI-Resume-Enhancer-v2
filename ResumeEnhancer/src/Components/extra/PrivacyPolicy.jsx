import LegalPage from './LegalPage'

const PrivacyPolicy = () => (
  <LegalPage title="Privacy Policy" updatedAt="August 24, 2026">
    <section>
      <h2>1. What this covers</h2>
      <p>
        This policy explains what information Resumify ("we", "our", "us") collects when you use
        our website and services — AI-powered resume review, resume building, cover letter
        generation, mock interviews, job search, and our recruiter and admin tools — and how we
        use, store, and protect it.
      </p>
    </section>

    <section>
      <h2>2. Information we collect</h2>
      <p>We collect information in a few ways:</p>
      <ul>
        <li><strong>Account information</strong> — name, email address, phone number, and a hashed password (or, if you sign in with Google or GitHub, the profile details those providers share with us).</li>
        <li><strong>Resume and career content</strong> — the resumes you upload or build, job descriptions you paste in for review, cover letters, chat messages with our AI coach, and mock interview transcripts.</li>
        <li><strong>Usage data</strong> — pages visited, features used, and approximate activity timestamps, used to keep the product working and to understand what's useful.</li>
        <li><strong>Payment information</strong> — when you purchase a paid plan, payment is processed directly by Razorpay. We store the resulting order id, payment id, and transaction status; we never see or store your card, UPI, or bank details.</li>
        <li><strong>Device and log information</strong> — IP address, browser type, and similar technical details collected automatically for security and troubleshooting.</li>
      </ul>
    </section>

    <section>
      <h2>3. How we use your information</h2>
      <ul>
        <li>To provide the core service — analyzing your resume against a job description, generating tailored content, and building your resume with our templates.</li>
        <li>To send resume text and job descriptions to our AI provider (Groq) for analysis. This content is sent solely to generate your review or draft and is not used by us to train any model.</li>
        <li>To manage your account, process payments, and send transactional emails (OTP verification, password resets, payment confirmations, plan changes, referral notices).</li>
        <li>To send optional emails you can opt out of individually from your Account page — streak reminders, weekly digests, win-back nudges, and resume health checks.</li>
        <li>To detect abuse, enforce our Terms, and keep the platform secure.</li>
      </ul>
    </section>

    <section>
      <h2>4. Sharing your information</h2>
      <p>We do not sell your personal information. We share it only with:</p>
      <ul>
        <li><strong>Service providers</strong> we rely on to operate Resumify — our AI provider (Groq) for resume/JD analysis, Razorpay for payment processing, Cloudinary for image storage, and our email delivery provider for transactional mail.</li>
        <li><strong>Recruiters</strong>, only when you knowingly apply to a job posted on our job board and choose to attach your resume to that application.</li>
        <li><strong>Law enforcement or regulators</strong>, only where required by law.</li>
      </ul>
    </section>

    <section>
      <h2>5. Data retention and deletion</h2>
      <p>
        We keep your account data for as long as your account is active. If you delete your
        account, it is suspended immediately and permanently erased after a 2-day grace period
        (during which logging back in restores it). You can also request a full export of your
        data from your Account page at any time.
      </p>
    </section>

    <section>
      <h2>6. Your rights</h2>
      <p>
        You can access, correct, or delete most of your information directly from your Account
        settings — your name, email, phone number, notification preferences, and your resumes and
        reviews. For anything else, contact us at{' '}
        <a href="mailto:support@resumeenhancer.com">support@resumeenhancer.com</a>.
      </p>
    </section>

    <section>
      <h2>7. Security</h2>
      <p>
        Passwords are stored using industry-standard hashing (bcrypt), sessions are protected with
        httpOnly cookies, and all traffic to our servers is encrypted over HTTPS. No method of
        transmission or storage is 100% secure, but we work to protect your information using
        practices appropriate to the sensitivity of the data.
      </p>
    </section>

    <section>
      <h2>8. Children's privacy</h2>
      <p>
        Resumify is intended for job seekers and professionals and is not directed at children
        under 13. We do not knowingly collect information from children under 13.
      </p>
    </section>

    <section>
      <h2>9. Changes to this policy</h2>
      <p>
        We may update this policy from time to time. If we make material changes, we'll update
        the "Last updated" date above and, where appropriate, notify you by email.
      </p>
    </section>

    <section>
      <h2>10. Contact us</h2>
      <p>
        Questions about this policy or your data? Email us at{' '}
        <a href="mailto:support@resumeenhancer.com">support@resumeenhancer.com</a>.
      </p>
    </section>
  </LegalPage>
)

export default PrivacyPolicy
