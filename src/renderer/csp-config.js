/**
 * Content Security Policy Configuration for Tasky 2.0
 * 
 * Different CSP policies for development vs production to balance
 * security with functionality needed for GSAP, Framer Motion, etc.
 */

const isDevelopment = process.env.NODE_ENV === 'development';

const developmentCSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Allow eval for dev tools and GSAP
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: file: blob: http://localhost:*",
  "font-src 'self' data:",
  "connect-src 'self' http://localhost:* https://*.googleapis.com https://generativelanguage.googleapis.com ws://localhost:*",
  "media-src 'self' blob:",
  "object-src 'none'",
  "child-src 'none'"
].join('; ');

const productionCSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval'", // Still need eval for GSAP
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: file: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.googleapis.com https://generativelanguage.googleapis.com",
  "media-src 'self' blob:",
  "object-src 'none'",
  "child-src 'none'"
].join('; ');

export const getCSP = () => isDevelopment ? developmentCSP : productionCSP;
