/**
 * The root layout must NOT declare a canonical address: Next.js inherits it into
 * every page, which made every page claim the home page as its canonical URL
 * (found on the live site, 3 October 2026).
 */
import { readFileSync } from "fs";
import { join } from "path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
// Strip comments so the explanation in the layout does not count as code.
const code = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("canonical URLs", () => {
  it("are not set in the root layout (it would apply to every page)", () => {
    expect(code(read("src/app/layout.tsx"))).not.toMatch(/canonical/);
  });

  it("are set per page where the address is known", () => {
    expect(code(read("src/app/page.tsx"))).toMatch(/canonical:\s*"\/"/);
    expect(code(read("src/app/blog/[slug]/page.tsx"))).toMatch(
      /canonical:\s*`\/blog\/\$\{/,
    );
    expect(code(read("src/app/projects/[slug]/page.tsx"))).toMatch(
      /canonical:\s*`\/projects\/\$\{/,
    );
  });
});
