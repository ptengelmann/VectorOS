import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-8 py-16">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-peach-500 rounded" />
              <span className="text-xl font-light tracking-tight text-gray-900">VectorOS</span>
            </div>
            <p className="text-sm font-light text-gray-500 leading-relaxed">
              The AI operating system for modern businesses.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-sm font-normal text-gray-900 mb-4">Product</h3>
            <ul className="space-y-3">
              <li>
                <Link href="#features" className="text-sm font-light text-gray-600 hover:text-gray-900 transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="text-sm font-light text-gray-600 hover:text-gray-900 transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="#security" className="text-sm font-light text-gray-600 hover:text-gray-900 transition-colors">
                  Security
                </Link>
              </li>
              <li>
                <Link href="#integrations" className="text-sm font-light text-gray-600 hover:text-gray-900 transition-colors">
                  Integrations
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-normal text-gray-900 mb-4">Company</h3>
            <ul className="space-y-3">
              <li>
                <Link href="#about" className="text-sm font-light text-gray-600 hover:text-gray-900 transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="#blog" className="text-sm font-light text-gray-600 hover:text-gray-900 transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="#careers" className="text-sm font-light text-gray-600 hover:text-gray-900 transition-colors">
                  Careers
                </Link>
              </li>
              <li>
                <Link href="#contact" className="text-sm font-light text-gray-600 hover:text-gray-900 transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-normal text-gray-900 mb-4">Legal</h3>
            <ul className="space-y-3">
              <li>
                <Link href="#privacy" className="text-sm font-light text-gray-600 hover:text-gray-900 transition-colors">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="#terms" className="text-sm font-light text-gray-600 hover:text-gray-900 transition-colors">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="#compliance" className="text-sm font-light text-gray-600 hover:text-gray-900 transition-colors">
                  Compliance
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-16 pt-8 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs font-light text-gray-500">
            © 2025 VectorOS. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="#twitter" className="text-xs font-light text-gray-500 hover:text-gray-900 transition-colors">
              Twitter
            </Link>
            <Link href="#linkedin" className="text-xs font-light text-gray-500 hover:text-gray-900 transition-colors">
              LinkedIn
            </Link>
            <Link href="#github" className="text-xs font-light text-gray-500 hover:text-gray-900 transition-colors">
              GitHub
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
