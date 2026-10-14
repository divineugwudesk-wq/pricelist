"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatCard } from "@/components/ui/stat";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { getStoreAnalytics } from "@/lib/analytics";
import {
  Eye,
  MousePointerClick,
  MessageCircle,
  Users,
  TrendingUp,
  Flame,
} from "lucide-react";

export default function AnalyticsPage() {
  const toast = useToast();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Awaited<ReturnType<typeof getStoreAnalytics>> | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await fetch("/api/businesses");
      const { business } = await res.json();
      if (!business || !mounted) {
        setLoading(false);
        return;
      }
      if (!mounted) return;
      setBusinessId(business.id);
      await load(business.id, days);
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  async function load(bizId: string, rangeDays: number) {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/analytics?businessId=${bizId}&days=${rangeDays}`,
      );
      const result = await res.json();
      setData(result.analytics ?? null);
    } catch {
      toast.error("Could not load analytics", "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const maxDaily = useMemo(() => {
    if (!data?.daily.length) return 1;
    return Math.max(...data.daily.map((d) => Math.max(d.views, d.clicks)), 1);
  }, [data]);

  const conversion = useMemo(() => {
    if (!data || data.storeViews === 0) return "0%";
    return `${Math.round((data.whatsappClicks / data.storeViews) * 100)}%`;
  }, [data]);

  return (
    <DashboardLayout userName={null}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-navy-900">
            Analytics
          </h1>
          <p className="mt-1 text-[13px] text-ink-muted">
            Understand how customers find and shop your store.
          </p>
        </div>
        <Select value={String(days)} onChange={(e) => setDays(Number(e.target.value))} className="w-40" aria-label="Date range">
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </Select>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : !data ? (
        <EmptyState
          title="No analytics yet"
          description="Share your store link to start seeing views, product interest and WhatsApp order clicks."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Store views" value={data.storeViews.toLocaleString()} icon={Eye} />
            <StatCard label="Product views" value={data.productViews.toLocaleString()} icon={MousePointerClick} />
            <StatCard label="WhatsApp order clicks" value={data.whatsappClicks.toLocaleString()} icon={MessageCircle} />
            <StatCard
              label="Checkout conversion"
              value={conversion}
              sub={`${data.uniqueSessions} unique visitors`}
              icon={TrendingUp}
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            {/* Traffic chart */}
            <Card className="lg:col-span-2">
              <CardHeader title="Store traffic" subtitle="Views and WhatsApp order clicks per day" />
              <CardBody>
                {data.daily.length === 0 ? (
                  <EmptyState
                    compact
                    icon={<Users className="h-5 w-5" />}
                    title="No traffic in this period"
                    description="Share your link on WhatsApp, Instagram or flyers to bring customers in."
                  />
                ) : (
                  <div className="flex h-44 items-end gap-1.5">
                    {data.daily.slice(-30).map((day) => (
                      <div
                        key={day.date}
                        className="group relative flex flex-1 flex-col justify-end gap-1"
                        title={`${day.date}: ${day.views} views, ${day.clicks} order clicks`}
                      >
                        <div
                          className="w-full rounded-t-md bg-navy-200 transition-all duration-200 group-hover:bg-navy-400"
                          style={{ height: `${Math.max(4, (day.views / maxDaily) * 100)}%` }}
                        />
                        <div
                          className="w-full rounded-t-md bg-gold transition-all duration-200 group-hover:bg-gold-soft"
                          style={{ height: `${Math.max(day.clicks > 0 ? 4 : 0, (day.clicks / maxDaily) * 100)}%` }}
                        />
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex items-center gap-5 text-xs text-ink-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-navy-300" />
                    Store views
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-gold" />
                    WhatsApp clicks
                  </span>
                </div>
              </CardBody>
            </Card>

            {/* Top products */}
            <Card>
              <CardHeader title="Top products" subtitle="By product views" />
              <CardBody>
                {data.productViewCounts.length === 0 ? (
                  <EmptyState
                    compact
                    icon={<Flame className="h-5 w-5" />}
                    title="No product views yet"
                    description="Product views appear here once customers browse your store."
                  />
                ) : (
                  <div className="space-y-3">
                    {data.productViewCounts.slice(0, 6).map((p, i) => {
                      const max = data.productViewCounts[0]?.views ?? 1;
                      return (
                        <div key={p.productId}>
                          <div className="mb-1 flex items-center justify-between text-[13px]">
                            <span className="truncate font-medium text-ink">
                              {i === 0 ? "🥇 " : i === 1 ? "🥈 " : i === 2 ? "🥉 " : ""}
                              {p.productName}
                            </span>
                            <span className="font-semibold text-navy-800">{p.views}</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-navy-100">
                            <div
                              className="h-full rounded-full bg-navy-800 transition-all duration-500"
                              style={{ width: `${(p.views / max) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {data.whatsappClicks > 0 && (
            <div className="mt-6 rounded-2xl border border-navy-100 bg-white p-5 shadow-soft">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E5F4EE] text-success">
                  <MessageCircle className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-sm font-medium text-ink">
                    <span className="font-semibold">{data.whatsappClicks}</span>{" "}
                    customers started a WhatsApp order in the last {days} days
                  </p>
                  <p className="mt-0.5 text-[13px] text-ink-muted">
                    Every click sends a formatted order to your WhatsApp. Follow up
                    quickly — most customers expect a reply within the hour.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
