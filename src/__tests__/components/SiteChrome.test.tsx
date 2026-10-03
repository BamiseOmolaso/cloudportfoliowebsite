/**
 * Which header and footer wraps which page:
 *  - "/", "/about", "/learning": nothing (they bring their own header and footer)
 *  - /admin, /login : the plain legacy header and footer
 *  - everything else: the new header (links back to the home page's sections)
 *                     and the new footer
 */
import { render, screen } from "@testing-library/react";
import SiteChrome from "@/components/layout/SiteChrome";

let mockPath = "/";
jest.mock("next/navigation", () => ({ usePathname: () => mockPath }));
jest.mock("@/components/layout/Navbar", () => ({
  __esModule: true,
  default: () => <div data-testid="legacy-navbar" />,
}));
jest.mock("@/components/layout/Footer", () => ({
  __esModule: true,
  default: () => <div data-testid="legacy-footer" />,
}));
jest.mock("@/components/portfolio/SiteFooter", () => ({
  __esModule: true,
  default: () => <footer data-testid="new-footer" />,
}));

const renderAt = (path: string) => {
  mockPath = path;
  return render(
    <SiteChrome fontClass="f">
      <p>page body</p>
    </SiteChrome>,
  );
};

describe("SiteChrome", () => {
  it.each(["/", "/about", "/learning", "/learning"])(
    "adds nothing around %s (it brings its own header and footer)",
    (path) => {
      renderAt(path);
      expect(screen.getByText("page body")).toBeInTheDocument();
      expect(screen.queryByTestId("new-footer")).toBeNull();
      expect(screen.queryByTestId("legacy-navbar")).toBeNull();
      expect(screen.queryByRole("banner")).toBeNull();
    },
  );

  it.each(["/admin", "/admin/blog/new", "/login"])(
    "keeps the legacy chrome on %s",
    (path) => {
      renderAt(path);
      expect(screen.getByTestId("legacy-navbar")).toBeInTheDocument();
      expect(screen.getByTestId("legacy-footer")).toBeInTheDocument();
      expect(screen.queryByTestId("new-footer")).toBeNull();
    },
  );

  it.each(["/blog", "/blog/some-post", "/projects", "/contact"])(
    "uses the new header and footer on %s",
    (path) => {
      renderAt(path);
      expect(screen.getByRole("banner")).toBeInTheDocument();
      expect(screen.getByTestId("new-footer")).toBeInTheDocument();
      expect(screen.queryByTestId("legacy-navbar")).toBeNull();
      expect(screen.getByText("page body")).toBeInTheDocument();
    },
  );

  it("does not treat /administrator as an admin route", () => {
    renderAt("/administrator");
    expect(screen.getByTestId("new-footer")).toBeInTheDocument();
  });

  it("points section links back at the home page, with no theme switch", () => {
    renderAt("/blog");
    const contact = screen
      .getAllByRole("link", { name: "Contact" })
      .map((a) => a.getAttribute("href"));
    expect(contact).toContain("/#contact");
    expect(contact).not.toContain("#contact");
    expect(
      screen.getByRole("link", { name: /Bamise Omolaso/ }),
    ).toHaveAttribute("href", "/");
    expect(screen.queryByRole("button", { name: /colour theme/i })).toBeNull();
    expect(screen.getByText("Skip to content")).toHaveAttribute(
      "href",
      "#main",
    );
  });
});
