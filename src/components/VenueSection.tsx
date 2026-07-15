import { Calendar, Clock, MapPin } from "lucide-react";
import { Section } from "./Section";

const venueDetails = [
  {
    icon: MapPin,
    label: "Lugar",
    value: "Rancho Gecko",
  },
  {
    icon: MapPin,
    label: "Dirección",
    value: "San Francisco de La Palmera",
  },
  {
    icon: Calendar,
    label: "Fecha",
    value: "Sábado 10 de Octubre, 2026",
  },
  {
    icon: Clock,
    label: "Hora",
    value: "2:00 pm",
  },
];

export function VenueSection() {
  return (
    <Section id="lugar" className="bg-beige-50 py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <h2 className="font-serif text-2xl text-sage-900 sm:text-3xl">
            Lugar y horario
          </h2>
          <div className="mx-auto mt-3 h-px w-12 bg-gold-400" />
        </div>

        <div className="rounded-2xl border border-beige-200 bg-white p-6 shadow-sm shadow-sage-900/5 sm:p-8">
          <ul className="space-y-6">
            {venueDetails.map((detail) => (
              <li key={detail.label} className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sage-50 text-sage-600">
                  <detail.icon className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                    {detail.label}
                  </p>
                  <p className="mt-1 text-base text-sage-800">{detail.value}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
