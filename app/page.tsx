import JobCompass from "@/components/job-compass";
import { isPublicDemoMode } from "@/lib/public-demo";

export default function Home() { return <JobCompass publicDemo={isPublicDemoMode()} />; }
