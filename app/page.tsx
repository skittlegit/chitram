import { indiaDateKey } from "./game-logic";
import HomeExperience from "./home-experience";

export const dynamic = "force-dynamic";

export default function Home() {
  return <HomeExperience initialDate={indiaDateKey()} />;
}
