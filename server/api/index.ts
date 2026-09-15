// Vercel serverless entry point. vercel.json rewrites every non-static path
// here; Hono then routes /health and /api/* exactly as the local server does.
import { handle } from "hono/vercel";
import { buildApp } from "../src/bootstrap.js";

// Story turns can take a while; Vercel caps this per plan (Hobby: 300s).
export const maxDuration = 300;

const { app } = buildApp();

export default handle(app);
