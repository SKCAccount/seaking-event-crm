import type { LabeledValue } from "../types";

/**
 * Classification of a speaking opportunity. Stored in `deals.opportunity_type`
 * (a text column with a CHECK constraint allowing exactly these values).
 */
export const opportunityTypeChoices: LabeledValue[] = [
  { value: "speaking", label: "Speaking" },
  { value: "CPE", label: "CPE" },
  { value: "breakout", label: "Breakout" },
  { value: "panel", label: "Panel" },
  { value: "other", label: "Other" },
];

/**
 * Pipelines this CRM tracks, stored in `deals.pipeline`.
 *
 * Only "accounting" is active today. To launch the CPG vertical later, just
 * uncomment the line below — the database already accepts 'cpg' (see the
 * `deals_pipeline_check` CHECK constraint), so no migration is needed.
 */
export const pipelineChoices: LabeledValue[] = [
  { value: "accounting", label: "Accounting" },
  // { value: "cpg", label: "CPG" },
];
