import { Shirt } from "lucide-react";
import { Section } from "./Section";

export function DressCodeSection() {
  return (
    <Section id="vestimenta" className="py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="font-serif text-2xl text-sage-900 sm:text-3xl">
          Código de vestimenta
        </h2>
        <div className="mx-auto mt-3 h-px w-12 bg-gold-400" />

        <div className="mx-auto mt-10 max-w-sm">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-beige-100 text-sage-600">
            <Shirt className="h-7 w-7" strokeWidth={1.5} />
          </div>

          <p className="font-serif text-lg text-sage-800">Formal elegante</p>
          <p className="mt-3 text-sm leading-relaxed text-gray-500">
            Les pedimos asistir con vestimenta formal. Colores sugeridos:
            tonos neutros, beige y verde salvia.
          </p>

          <div className="mt-6 rounded-xl border border-beige-200 bg-beige-50 px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
              Colores a evitar
            </p>
            <ul className="mt-3 space-y-3 text-sm text-gray-600">
              <li className="flex items-center justify-center gap-2.5">
                <span
                  className="inline-block h-5 w-5 shrink-0 rounded-full border border-gray-200 bg-white"
                  aria-hidden="true"
                />
                Blanco
              </li>
              <li className="flex items-center justify-center gap-2.5">
                <span
                  className="inline-block h-5 w-5 shrink-0 rounded-full border border-gray-300"
                  style={{ backgroundColor: "#4E5E5D" }}
                  aria-hidden="true"
                />
                Verde eucalipto
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Section>
  );
}
