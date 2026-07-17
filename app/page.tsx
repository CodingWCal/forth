import { ForthApp } from "@/components/forth-app";
import { createSeedWorkspace } from "@/lib/seed";

export default function Home() {
  const renderedAt = new Date();
  return (
    <ForthApp
      initialState={createSeedWorkspace(renderedAt)}
      renderedAt={renderedAt.toISOString()}
    />
  );
}
