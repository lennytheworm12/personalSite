import type { ProseSection } from "./project-schema";

/**
 * Author identity used by the graph person node and the graph detail region.
 * Kept separate from project records: there is exactly one author.
 *
 * Intro copy is provisional draft text (decisions-log.md R3) until the
 * content-audit pass replaces it.
 */
export interface Profile {
  /** Stable semantic node id, e.g. "person:bi". */
  nodeId: string;
  name: string;
  intro: ProseSection;
}

export const profile: Profile = {
  nodeId: "person:bi",
  name: "Bi Phan",
  intro: {
    text: "DRAFT: Bi Phan is a software engineer who builds personal projects such as Spotify Sorter and Game Teacher. A full introduction has not been written yet.",
    provisional: true,
  },
};
