"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FolderOpen,
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  GripVertical,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

interface Category {
  id: string;
  name: string;
  sortOrder: number;
  _count: { products: number };
}

export default function CategoriesPage() {
  const toast = useToast();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [limitNotice, setLimitNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/categories");
    const data = await res.json();
    setCategories(data.categories ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    if (!name.trim()) return;
    setCreating(true);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setCreating(false);
    if (res.status === 403 && data.code === "PLAN_LIMIT") {
      setLimitNotice(data.error);
      return;
    }
    if (!res.ok) {
      toast.error("Could not create category", data.error ?? "Please try again.");
      return;
    }
    toast.success("Category created");
    setName("");
    await load();
  }

  async function saveEdit() {
    if (!editing || !editName.trim()) return;
    const res = await fetch(`/api/categories/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    if (!res.ok) {
      toast.error("Could not update", "Please try again.");
      return;
    }
    toast.success("Category updated");
    setEditing(null);
    await load();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete", "Please try again.");
      return;
    }
    toast.success("Category deleted", "Products were kept as uncategorized.");
    await load();
  }

  async function reorder(id: string, direction: "up" | "down") {
    if (!categories) return;
    const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = sorted.findIndex((c) => c.id === id);
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= sorted.length) return;
    const next = [...sorted];
    [next[index], next[swapWith]] = [next[swapWith], next[index]];
    const reordered = next.map((c, i) => ({ ...c, sortOrder: i }));
    setCategories(reordered);
    // Persist order via PATCH on each moved item.
    for (const c of [next[index], next[swapWith]]) {
      const target = reordered.find((r) => r.id === c.id);
      await fetch(`/api/categories/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: c.name, sortOrder: target?.sortOrder }),
      }).catch(() => undefined);
    }
    await load();
  }

  return (
    <DashboardLayout userName={null}>
      <div className="mb-7">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-navy-900">
          Categories
        </h1>
        <p className="mt-1 text-[13px] text-ink-muted">
          Organize your products — customers filter by category on your storefront.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-navy-100 bg-white p-6 shadow-soft lg:col-span-1">
          <p className="text-[13px] font-medium text-ink-secondary">New category</p>
          <div className="mt-4 space-y-4">
            <Field label="Name" htmlFor="cat-name">
              <Input
                id="cat-name"
                placeholder="e.g. New Arrivals"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void create();
                }}
              />
            </Field>
            <Button onClick={() => void create()} loading={creating} className="w-full">
              <Plus className="h-4 w-4" />
              Add category
            </Button>
            {limitNotice && (
              <p className="rounded-xl bg-gold-faint px-3 py-2 text-[13px] text-gold-deep">
                {limitNotice}{" "}
                <a href="/dashboard/billing" className="font-semibold underline">
                  Upgrade plan
                </a>
              </p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-navy-100 bg-white shadow-soft lg:col-span-2">
          <div className="border-b border-navy-50 px-6 py-5">
            <h3 className="font-heading text-[15px] font-semibold text-ink">
              Your categories
            </h3>
            <p className="mt-0.5 text-[13px] text-ink-muted">
              Drag order controls the storefront order.
            </p>
          </div>
          {categories === null ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-navy-100" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <EmptyState
              compact
              icon={<FolderOpen className="h-5 w-5" />}
              title="No categories yet"
              description="Create categories like Sneakers, Shirts, New Arrivals to organize your store."
            />
          ) : (
            <div className="divide-y divide-navy-50">
              {[...categories]
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 px-6 py-3.5 transition-colors hover:bg-navy-50/40"
                  >
                    <GripVertical className="h-4 w-4 shrink-0 text-navy-200" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{c.name}</p>
                      <p className="text-xs text-ink-muted">
                        {c._count.products} product{c._count.products === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => void reorder(c.id, "up")}
                        className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-navy-100"
                        aria-label="Move up"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => void reorder(c.id, "down")}
                        className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-navy-100"
                        aria-label="Move down"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => { setEditing(c); setEditName(c.name); }}
                        className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-navy-100"
                        aria-label="Edit category"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => void remove(c.id)}
                        className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-[#F9E9E9] hover:text-danger"
                        aria-label="Delete category"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Edit category"
      >
        <div className="space-y-4 px-6 py-6">
          <Field label="Name" htmlFor="cat-edit">
            <Input
              id="cat-edit"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </Field>
          <Button onClick={() => void saveEdit()} className="w-full">
            Save changes
          </Button>
        </div>
      </Dialog>
    </DashboardLayout>
  );
}
