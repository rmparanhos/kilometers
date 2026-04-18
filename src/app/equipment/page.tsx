import { Header } from "@/components/layout/Header";

export default function EquipmentPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Equipment</h1>
          <p className="mt-2 text-sm text-gray-500">
            Track your shoes, average pace, HR, cadence, and accumulated km here.
          </p>
        </div>
      </main>
    </>
  );
}
