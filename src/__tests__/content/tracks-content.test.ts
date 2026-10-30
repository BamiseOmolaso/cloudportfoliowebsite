import {
  dataProjects,
  projects,
  projectsByTrack,
  trackChoice,
  tracks,
} from "@/content/portfolio";

describe("the data and cloud tracks", () => {
  it("each track has a page address and a door on the home page", () => {
    expect(tracks.data.href).toBe("/data");
    expect(tracks.cloud.href).toBe("/cloud");
    Object.values(tracks).forEach((t) => {
      expect(t.cardTitle).toBeTruthy();
      expect(t.tools.length).toBeGreaterThan(0);
    });
  });

  it("shows the curated cloud projects on /cloud and the data projects on /data", () => {
    expect(projectsByTrack.cloud).toBe(projects);
    expect(projectsByTrack.data).toBe(dataProjects);
  });

  it("gives every data project a body, a stack and only public https links", () => {
    expect(dataProjects.length).toBeGreaterThan(0);
    dataProjects.forEach((p) => {
      expect(p.body.length).toBeGreaterThan(40);
      expect(p.stack.length).toBeGreaterThan(0);
      p.links.forEach((l) => expect(l.href).toMatch(/^https:\/\//));
      // a project with no public link says why
      if (p.links.length === 0) expect(p.note).toBeTruthy();
    });
  });

  it("keeps data project titles unique", () => {
    const titles = dataProjects.map((p) => p.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("avoids the banned words in the new copy", () => {
    const text = JSON.stringify([tracks, trackChoice, dataProjects]);
    expect(text).not.toMatch(
      /seamless|elevate|unleash|next-gen|game-changer|delve|tapestry|leverage|cutting-edge|world-class|passionate/i,
    );
  });
});
