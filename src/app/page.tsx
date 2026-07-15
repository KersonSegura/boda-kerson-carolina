import { DressCodeSection } from "@/components/DressCodeSection";
import { GiftListSection } from "@/components/GiftListSection";
import { HeroSection } from "@/components/HeroSection";
import { VenueSection } from "@/components/VenueSection";

export default function Home() {
  return (
    <main>
      <HeroSection />
      <VenueSection />
      <DressCodeSection />
      <GiftListSection />

      <footer className="border-t border-beige-200 py-10 text-center">
        <p className="font-serif text-lg text-sage-800">Kerson & Carolina</p>
        <p className="mt-1 text-xs text-gray-400">Con amor, 2026</p>
      </footer>
    </main>
  );
}
