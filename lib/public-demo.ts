import { env } from "cloudflare:workers";
import { isPublicDemoValue, PUBLIC_DEMO_MESSAGE } from "@/lib/public-demo-core";

export { PUBLIC_DEMO_MESSAGE } from "@/lib/public-demo-core";

type PublicDemoEnv = { PUBLIC_DEMO_MODE?: string };

export function isPublicDemoMode() {
  const value = (env as unknown as PublicDemoEnv).PUBLIC_DEMO_MODE;
  return isPublicDemoValue(value);
}

export function blockPublicDemoMutation() {
  if (!isPublicDemoMode()) return null;
  return Response.json({ error: PUBLIC_DEMO_MESSAGE }, { status: 403 });
}
