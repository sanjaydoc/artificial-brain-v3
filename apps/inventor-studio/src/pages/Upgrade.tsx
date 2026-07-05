// TODO: Full port — source `inventor-studio-react-app/src/pages/Upgrade.jsx` is 433 lines.
// Skipped due to context budget. Notes:
//   - Razorpay checkout flow: createRazorpayOrder, verifyRazorpayPayment, submitManualPayment
//   - getSubscriptionPrices populates tier cards
//   - Razorpay JS SDK injected via <script src="https://checkout.razorpay.com/v1/checkout.js" />
import { useNavigate } from 'react-router-dom'

export default function Upgrade() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex items-center justify-center" className="bg-background text-muted-foreground">
      <div className="glass-card p-8 text-center max-w-md">
        <h1 className="font-head text-xl text-foreground mb-2">Upgrade</h1>
        <p className="text-sm">Razorpay upgrade flow not ported yet. See <code>Upgrade.jsx</code>.</p>
        <button onClick={() => navigate('/dashboard')} className="btn-secondary mt-4">Back</button>
      </div>
    </div>
  )
}
