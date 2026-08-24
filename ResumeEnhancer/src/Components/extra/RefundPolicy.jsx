import LegalPage from './LegalPage'

const RefundPolicy = () => (
  <LegalPage title="Refund & Cancellation Policy" updatedAt="August 24, 2026">
    <section>
      <h2>1. How our plans work</h2>
      <p>
        Pro and Pro Max are one-time, 30-day purchases — not a recurring subscription. There's no
        auto-renewal and no mandate set up with Razorpay, so there's nothing to "cancel" the way
        you would a subscription: when your 30 days end, your account simply reverts to the free
        Basic plan unless you purchase another 30-day period.
      </p>
    </section>

    <section>
      <h2>2. Eligibility for a refund</h2>
      <p>You may be eligible for a refund if:</p>
      <ul>
        <li>You were charged but never received access to the plan you paid for (a failed or stuck upgrade).</li>
        <li>You were charged twice for the same purchase due to a technical error.</li>
        <li>You request a refund within <strong>24 hours</strong> of purchase and have not used any credits from the paid plan yet.</li>
      </ul>
    </section>

    <section>
      <h2>3. What isn't eligible</h2>
      <ul>
        <li>Requests made after the 24-hour window, once you've started using Pro/Pro Max credits.</li>
        <li>Dissatisfaction with AI-generated output quality — reviews and rewrites are provided as guidance, not a guaranteed result (see our <a href="/Terms-And-Conditions">Terms &amp; Conditions</a>).</li>
        <li>Partial refunds for partially used plan periods — since credits reset entirely each cycle rather than accruing daily, we don't pro-rate refunds for partial use.</li>
      </ul>
    </section>

    <section>
      <h2>4. How to request a refund</h2>
      <p>
        Email <a href="mailto:support@resumeenhancer.com">support@resumeenhancer.com</a> with the
        email address on your account and, if you have it, the payment/order id from your Account
        page's Payment History. We aim to respond within 2 business days.
      </p>
    </section>

    <section>
      <h2>5. Refund processing time</h2>
      <p>
        Approved refunds are issued back to your original payment method via Razorpay.
        Razorpay typically takes 5–7 business days to credit the refund, though this can vary by
        your bank or payment provider.
      </p>
    </section>

    <section>
      <h2>6. Account deletion vs. refunds</h2>
      <p>
        Deleting your account does not automatically trigger a refund for any active plan period.
        If you want both a refund and account deletion, please request the refund first — once
        your account is permanently deleted (after the 2-day recovery window), we may not be able
        to verify your purchase.
      </p>
    </section>

    <section>
      <h2>7. Contact us</h2>
      <p>
        For any billing question not covered here, reach out at{' '}
        <a href="mailto:support@resumeenhancer.com">support@resumeenhancer.com</a>.
      </p>
    </section>
  </LegalPage>
)

export default RefundPolicy
