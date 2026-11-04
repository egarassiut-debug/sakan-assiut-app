import type { IncomingMessage, ServerResponse } from 'http';
import app from '../server';

/**
 * Vercel Serverless Function Entry Point for /api routes
 * Wraps and delegates HTTP requests to the centralized Express application.
 */
export default function handler(req: IncomingMessage, res: ServerResponse) {
  return (app as any)(req, res);
}
