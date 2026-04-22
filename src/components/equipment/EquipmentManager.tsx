"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  Footprints,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { formatDistance, formatPace, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from "@/components/ui/card";
import {
  Progress,
  ProgressTrack,
  ProgressIndicator,
} from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Equipment {
  id: string;
  name: string;
  brand: string | null;
  type: string;
  maxDistanceM: number;
  purchaseDate: string | null;
  retiredAt: string | null;
  notes: string | null;
  stats: {
    totalDistanceM: number;
    avgPaceMperS: number;
  };
  trend: { name: string; pace: number }[];
}

export function EquipmentManager() {
  const [items, setItems] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<Equipment | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    maxDistanceM: 800, // stored as km in form for easier entry
    purchaseDate: "",
    notes: "",
  });

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    setLoading(true);
    try {
      const res = await fetch("/api/equipment");
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || "Failed to load equipment");
      }
    } catch (err) {
      toast.error("Failed to load equipment");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...formData,
      maxDistanceM: Number(formData.maxDistanceM) * 1000,
      purchaseDate: formData.purchaseDate || null,
    };

    try {
      const url = editingItem
        ? `/api/equipment/${editingItem.id}`
        : "/api/equipment";
      const res = await fetch(url, {
        method: editingItem ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(editingItem ? "Shoe updated" : "Shoe added");
        setIsAdding(false);
        setEditingItem(null);
        await fetchItems();
        setFormData({
          name: "",
          brand: "",
          maxDistanceM: 800,
          purchaseDate: "",
          notes: "",
        });
      } else {
        throw new Error();
      }
    } catch (err) {
      toast.error("Something went wrong");
    }
  }

  async function toggleRetired(item: Equipment) {
    try {
      const res = await fetch(`/api/equipment/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          retiredAt: item.retiredAt ? null : new Date().toISOString(),
        }),
      });

      if (res.ok) {
        toast.success(item.retiredAt ? "Shoe reactivated" : "Shoe retired");
        fetchItems();
      }
    } catch (err) {
      toast.error("Failed to update status");
    }
  }

  async function deleteItem(id: string) {
    if (
      !confirm(
        "Are you sure? This will unassign this shoe from all activities.",
      )
    )
      return;

    try {
      const res = await fetch(`/api/equipment/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Shoe deleted");
        fetchItems();
      }
    } catch (err) {
      toast.error("Failed to delete shoe");
    }
  }

  const activeItems = items.filter((i) => !i.retiredAt);
  const retiredItems = items.filter((i) => i.retiredAt);

  if (loading)
    return (
      <div className="py-20 text-center text-muted-foreground animate-pulse">
        Loading gear...
      </div>
    );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Footprints className="size-5" /> Active Gear
        </h2>
        <Dialog
          open={isAdding}
          onOpenChange={(open) => {
            setIsAdding(open);
            if (!open) {
              setEditingItem(null);
              setFormData({
                name: "",
                brand: "",
                maxDistanceM: 800,
                purchaseDate: "",
                notes: "",
              });
            }
          }}>
          <DialogTrigger
            render={
              <Button
                size="sm"
                onClick={() => {
                  setEditingItem(null);
                  setFormData({
                    name: "",
                    brand: "",
                    maxDistanceM: 800,
                    purchaseDate: "",
                    notes: "",
                  });
                }}
              />
            }>
            <Plus data-icon="inline-start" /> Add Shoe
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Edit Shoe" : "Add New Shoe"}
              </DialogTitle>
            </DialogHeader>
            <form
              onSubmit={handleSubmit}
              className="space-y-4 pt-4">
              <div className="grid gap-2">
                <Label htmlFor="brand">Brand</Label>
                <Input
                  id="brand"
                  value={formData.brand}
                  onChange={(e) =>
                    setFormData({ ...formData, brand: e.target.value })
                  }
                  placeholder="e.g. Nike, Hoka, Saucony"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Model Name</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g. Pegasus 40"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="maxDist">Retirement Limit (km)</Label>
                <Input
                  id="maxDist"
                  type="number"
                  required
                  value={formData.maxDistanceM}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxDistanceM: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="purchaseDate">Purchase Date</Label>
                <Input
                  id="purchaseDate"
                  type="date"
                  value={formData.purchaseDate}
                  onChange={(e) =>
                    setFormData({ ...formData, purchaseDate: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                />
              </div>
              <DialogFooter>
                <Button type="submit">Save Shoe</Button>
              </DialogFooter>

            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {activeItems.map((item) => (
          <EquipmentCard
            key={item.id}
            item={item}
            onEdit={() => {
              setEditingItem(item);
              setFormData({
                brand: item.brand || "",
                name: item.name,
                maxDistanceM: item.maxDistanceM / 1000,
                purchaseDate: item.purchaseDate
                  ? new Date(item.purchaseDate).toISOString().split("T")[0]
                  : "",
                notes: item.notes || "",
              });
              setIsAdding(true);
            }}
            onRetire={() => toggleRetired(item)}
            onDelete={() => deleteItem(item.id)}
          />
        ))}
        {activeItems.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl border-muted/50">
            <p className="text-muted-foreground">
              No active shoes found. Add your first pair!
            </p>
          </div>
        )}
      </div>

      {retiredItems.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="size-5" /> Retired Gear
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 opacity-75">
            {retiredItems.map((item) => (
              <EquipmentCard
                key={item.id}
                item={item}
                onEdit={() => {
                  setEditingItem(item);
                  setFormData({
                    brand: item.brand || "",
                    name: item.name,
                    maxDistanceM: item.maxDistanceM / 1000,
                    purchaseDate: item.purchaseDate
                      ? new Date(item.purchaseDate).toISOString().split("T")[0]
                      : "",
                    notes: item.notes || "",
                  });
                  setIsAdding(true);
                }}
                onRetire={() => toggleRetired(item)}
                onDelete={() => deleteItem(item.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EquipmentCard({
  item,
  onEdit,
  onRetire,
  onDelete,
}: {
  item: Equipment;
  onEdit: () => void;
  onRetire: () => void;
  onDelete: () => void;
}) {
  const percent = Math.min(
    (item.stats.totalDistanceM / item.maxDistanceM) * 100,
    100,
  );
  const isNearRetirement = percent >= 80;
  const isOverRetirement = percent >= 100;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 min-w-0">
        <CardTitle
          className="text-lg truncate"
          title={`${item.brand ? item.brand + " " : ""}${item.name}`}>
          {item.brand && (
            <span className="text-muted-foreground font-normal">
              {item.brand}{" "}
            </span>
          )}
          {item.name}
        </CardTitle>
        <CardDescription className="flex items-center gap-2 mt-1">
          <Badge
            variant="outline"
            className="text-[10px] uppercase font-bold tracking-tight px-1.5 py-0">
            {item.type}
          </Badge>
          {item.retiredAt && <Badge variant="secondary">Retired</Badge>}
        </CardDescription>
        <CardAction className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={onEdit}
            disabled={!!item.retiredAt}>
            <Edit2 className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-destructive hover:bg-destructive/10"
            onClick={onDelete}>
            <Trash2 className="size-4" />
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Distance Stats */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm font-medium">
            <span>{formatDistance(item.stats.totalDistanceM)}</span>
            <span className="text-muted-foreground">
              Limit: {formatDistance(item.maxDistanceM)}
            </span>
          </div>
          <Progress
            value={percent}
            className={cn(
              "h-2",
              isOverRetirement
                ? "**:data-[slot=progress-indicator]:bg-red-500 **:data-[slot=progress-track]:bg-red-100"
                : isNearRetirement
                  ? "**:data-[slot=progress-indicator]:bg-orange-500 **:data-[slot=progress-track]:bg-orange-100"
                  : "**:data-[slot=progress-indicator]:bg-green-500 **:data-[slot=progress-track]:bg-gray-100",
            )}
          />
          {isOverRetirement && !item.retiredAt && (
            <p className="text-[10px] font-bold text-red-600 uppercase flex items-center gap-1">
              <AlertTriangle className="size-3" /> Time to replace these!
            </p>
          )}
        </div>

        {/* Pace Trend Sparkline */}
        {item.trend.length > 1 && (
          <div className="h-20 w-full pt-2">
            <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">
              Monthly Pace Trend
            </p>
            <ResponsiveContainer
              width="100%"
              height="100%">
              <LineChart data={item.trend}>
                <Line
                  type="monotone"
                  dataKey="pace"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  dot={false}
                />
                <YAxis
                  reversed
                  hide
                  domain={["auto", "auto"]}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 pt-2 border-t text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Avg Pace</p>
            <p className="font-semibold tabular-nums">
              {formatPace(item.stats.avgPaceMperS)}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Status</p>
            <div className="flex items-center gap-2">
              <Switch
                size="sm"
                checked={!item.retiredAt}
                onCheckedChange={() => onRetire()}
              />
              <span className="text-xs font-medium text-foreground">
                {item.retiredAt ? "Inactive" : "Active"}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
