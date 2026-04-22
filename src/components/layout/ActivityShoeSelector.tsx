"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Footprints } from "lucide-react";

interface Equipment {
  id: string;
  name: string;
  brand: string | null;
}

interface Props {
  activityId: string;
  initialEquipmentId: string | null;
}

export function ActivityShoeSelector({ activityId, initialEquipmentId }: Props) {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [selectedId, setSelectedId] = useState<string>(initialEquipmentId || "none");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEquipment() {
      try {
        const res = await fetch("/api/equipment");
        if (res.ok) {
          const data = await res.json();
          // Only show non-retired shoes or the currently selected one
          setEquipment(data);
        }
      } catch (err) {
        console.error("Failed to fetch equipment", err);
      } finally {
        setLoading(false);
      }
    }
    fetchEquipment();
  }, []);

  async function handleValueChange(value: string | null) {
    const newId = value === "none" || value === null ? null : value;
    setSelectedId(value || "none");

    try {
      const res = await fetch(`/api/activities/${activityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ equipmentId: newId }),
      });

      if (!res.ok) throw new Error("Failed to update shoe");
      toast.success("Shoe updated");
    } catch (err) {
      toast.error("Failed to update shoe");
      setSelectedId(initialEquipmentId || "none");
    }
  }

  if (loading) return <div className="h-10 w-[200px] animate-pulse bg-slate-100 rounded-lg mt-5" />;

  const selectedShoe = equipment.find((e) => e.id === selectedId);
  const displayLabel = selectedId === "none" 
    ? "No shoe assigned" 
    : selectedShoe 
      ? `${selectedShoe.brand ? selectedShoe.brand + " " : ""}${selectedShoe.name}`
      : undefined;

  return (
    <div className="flex flex-col gap-1.5 min-w-[200px]">
      <Label htmlFor="shoe-select" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        <Footprints className="size-3" />
        Gear / Shoe
      </Label>
      <Select value={selectedId} onValueChange={handleValueChange}>
        <SelectTrigger id="shoe-select" className="h-9 bg-white max-w-[250px] min-w-0">
          <SelectValue placeholder="Select a shoe" className="truncate">
            <span className="truncate block" title={displayLabel}>
              {displayLabel}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No shoe assigned</SelectItem>
          {equipment.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.brand ? `${item.brand} ` : ""}{item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
