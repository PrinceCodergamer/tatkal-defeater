'use client';

export function Footer() {
  return (
    <footer className="irctc-footer irctc-footer-top">
      <div className="irctc-footer-inner">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-8">
          <div>
            <h4 className="text-white font-bold text-sm mb-3">IRCTC Tatkal</h4>
            <ul className="space-y-1.5 text-xs opacity-70">
              <li>About Us</li>
              <li>Contact Us</li>
              <li>Terms of Use</li>
              <li>Privacy Policy</li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold text-sm mb-3">Services</h4>
            <ul className="space-y-1.5 text-xs opacity-70">
              <li>Train Search</li>
              <li>PNR Status</li>
              <li>Track Train</li>
              <li>Cancellation</li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold text-sm mb-3">Fair Booking</h4>
            <ul className="space-y-1.5 text-xs opacity-70">
              <li>🎲 Random Lottery</li>
              <li>🔒 Seat Lock</li>
              <li>🛡️ No Bots</li>
              <li>⚡ Atomic Allocation</li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold text-sm mb-3">Support</h4>
            <ul className="space-y-1.5 text-xs opacity-70">
              <li>📞 1800-XXX-XXXX</li>
              <li>✉️ support@irctc-fair.in</li>
              <li>💬 Live Chat</li>
              <li>❓ FAQ</li>
            </ul>
          </div>
        </div>

        <div className="irctc-footer-bottom">
          <p className="mb-1">
            © {new Date().getFullYear()} IRCTC Fair Booking Platform. All rights reserved.
          </p>
          <p className="text-[10px]">
            Built with ❤️ for fair Indian Railway booking. Not affiliated with IRCTC.
            Random lottery system ensures equal opportunity for all passengers.
          </p>
        </div>
      </div>
    </footer>
  );
}
