import { CalendarClock } from "lucide-react";
import { useGetList } from "ra-core";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ReferenceField } from "@/components/admin/reference-field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { CompanyAvatar } from "../companies/CompanyAvatar";
import { findDealLabel } from "../deals/dealUtils";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { SimpleList } from "../simple-list/SimpleList";
import type { Deal } from "../types";

const RANGES = [
  { days: 1, label: "Today" },
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
];

/**
 * Dashboard widget listing opportunities added over a recent window (the inbox
 * agent drops new finds here). Lets the user check daily what needs outreach.
 */
export const NewOpportunities = () => {
  const { dealStages } = useConfigurationContext();
  const [days, setDays] = useState(7);

  const since = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - days + 1);
    return d.toISOString();
  }, [days]);

  const { data, total, isPending } = useGetList<Deal>("deals", {
    pagination: { page: 1, perPage: 10 },
    sort: { field: "created_at", order: "DESC" },
    filter: { "archived_at@is": null, "created_at@gte": since },
  });

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="mr-3 flex">
            <CalendarClock className="text-muted-foreground w-6 h-6" />
          </div>
          <Link
            className="text-xl font-semibold text-muted-foreground hover:underline"
            to="/deals"
          >
            New Opportunities
          </Link>
        </div>
        <div className="flex gap-1">
          {RANGES.map((range) => (
            <Button
              key={range.days}
              size="sm"
              variant={days === range.days ? "default" : "ghost"}
              onClick={() => setDays(range.days)}
            >
              {range.label}
            </Button>
          ))}
        </div>
      </div>
      <Card>
        {!isPending && (total ?? 0) === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            No new opportunities in this period.
          </p>
        ) : (
          <SimpleList<Deal>
            resource="deals"
            linkType="show"
            data={data}
            total={total}
            isPending={isPending}
            primaryText={(deal) => deal.event_name || deal.name}
            secondaryText={(deal) =>
              [deal.source, findDealLabel(dealStages, deal.stage)]
                .filter(Boolean)
                .join(" · ")
            }
            leftAvatar={(deal) => (
              <ReferenceField
                source="company_id"
                record={deal}
                reference="companies"
                resource="deals"
                link={false}
              >
                <CompanyAvatar width={20} height={20} />
              </ReferenceField>
            )}
          />
        )}
      </Card>
    </>
  );
};
