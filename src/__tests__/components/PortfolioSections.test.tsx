/**
 * Smoke tests for the redesigned page's sections: each one renders without
 * throwing and shows its heading, and the pipeline demo reacts to its toggle.
 * Content is static, so these guard against a broken import, a bad content
 * edit, or a component crash, which is what would otherwise reach production.
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import Results from "@/components/portfolio/Results";
import Skills from "@/components/portfolio/Skills";
import Incidents from "@/components/portfolio/Incidents";
import Patterns from "@/components/portfolio/Patterns";
import TerraformJourney from "@/components/portfolio/TerraformJourney";
import PipelineDemo from "@/components/portfolio/PipelineDemo";
import Contact from "@/components/portfolio/Contact";
import { pipeline } from "@/content/portfolio";

beforeAll(() => {
  // jsdom has neither of these browser features; the components use them.
  window.matchMedia = ((query: string) => ({
    matches: true, // behave as "reduce motion": timers fire with no delay
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;

  class IO {
    observe = jest.fn();
    unobserve = jest.fn();
    disconnect = jest.fn();
    takeRecords() {
      return [];
    }
  }
  (
    window as unknown as { IntersectionObserver: unknown }
  ).IntersectionObserver = IO;
});

describe("portfolio sections render", () => {
  it.each([
    ["Results", Results],
    ["Skills", Skills],
    ["Incidents", Incidents],
    ["Patterns", Patterns],
    ["TerraformJourney", TerraformJourney],
  ])("%s renders content", (_name, Component) => {
    const { container } = render(<Component />);
    expect(container.textContent?.length ?? 0).toBeGreaterThan(50);
    expect(container.querySelector("h2, h3")).not.toBeNull();
  });
});

describe("PipelineDemo", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("lists every pipeline stage", () => {
    render(<PipelineDemo />);
    for (const stage of pipeline.stages) {
      expect(screen.getAllByText(stage.title).length).toBeGreaterThan(0);
    }
  });

  it("runs to the end when nothing is broken", () => {
    render(<PipelineDemo />);
    fireEvent.click(screen.getByRole("button", { name: /run/i }));
    act(() => {
      jest.runAllTimers();
    });
    expect(screen.queryAllByText(/fail/i).length).toBe(0);
  });

  it("stops at the failing stage when a test is broken", () => {
    render(<PipelineDemo />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /run/i }));
    act(() => {
      jest.runAllTimers();
    });
    expect(screen.queryAllByText(/fail/i).length).toBeGreaterThan(0);
  });
});

describe("Contact", () => {
  it("links to the full contact form page", () => {
    render(<Contact />);
    expect(
      screen.getByRole("link", { name: "Send a message" }),
    ).toHaveAttribute("href", "/contact");
  });
});
