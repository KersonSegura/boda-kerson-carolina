import { gifts } from "@/data/gifts";
import { GiftCard } from "./GiftCard";
import { Section } from "./Section";

export function GiftListSection() {
  const availableCount = gifts.filter((g) => g.estado === "disponible").length;

  return (
    <Section id="regalos" className="bg-beige-50 py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <h2 className="font-serif text-2xl text-sage-900 sm:text-3xl">
            Lista de regalos para el té de cocina
          </h2>
          <div className="mx-auto mt-3 h-px w-12 bg-gold-400" />
          <p className="mt-4 text-sm text-gray-500">
            {availableCount} regalo{availableCount !== 1 ? "s" : ""} disponible
            {availableCount !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
          {gifts.map((gift) => (
            <GiftCard key={gift.id} gift={gift} />
          ))}
        </div>
      </div>
    </Section>
  );
}
