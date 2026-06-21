import { Badge } from "@/components/ui/badge";

import type { Deal } from "../types";
import { formatISODateString } from "./dealUtils";

const CONFIDENCE_STYLES: Record<string, string> = {
  high: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-rose-100 text-rose-800",
};

/**
 * Compact status badges for an opportunity: an "actionable" flag (a call for
 * speakers / submission deadline is open) and the inbox agent's confidence
 * rating. Renders nothing when neither is set.
 */
export const DealStatusBadges = ({
  deal,
  className,
}: {
  deal: Deal;
  className?: string;
}) => {
  if (!deal?.actionable && !deal?.confidence) return null;
  return (
    <div className={`flex flex-wrap items-center gap-1 ${className ?? ""}`}>
      {deal.actionable ? (
        <Badge className="border-transparent bg-amber-500 text-white hover:bg-amber-500">
          ⚡{" "}
          {deal.deadline
            ? `Deadline ${formatISODateString(deal.deadline)}`
            : "Call open"}
        </Badge>
      ) : null}
      {deal.confidence ? (
        <Badge
          variant="outline"
          className={`border-transparent capitalize ${
            CONFIDENCE_STYLES[deal.confidence] ?? ""
          }`}
        >
          {deal.confidence} confidence
        </Badge>
      ) : null}
    </div>
  );
};
