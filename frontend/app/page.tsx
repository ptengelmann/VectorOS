/**
 * VectorOS Marketing Landing Page
 * Enterprise-grade design with modern, sleek components
 */

import Navigation from './components/landing/Navigation';
import Hero from './components/landing/Hero';
import Features from './components/landing/Features';
import CTA from './components/landing/CTA';
import Footer from './components/landing/Footer';

export default function Home() {
  return (
    <div className="bg-white min-h-screen">
      <Navigation />
      <Hero />
      <Features />
      <CTA />
      <Footer />
    </div>
  );
}
