import Image from "next/image";
import { Section } from "./Section";

export function HeroSection() {
  return (
    <Section id="inicio" className="pt-28 pb-16 sm:pt-32 sm:pb-20">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.25em] text-gold-500">
          10 · Octubre · 2026
        </p>

        <h1 className="font-serif text-4xl leading-tight text-sage-900 sm:text-5xl md:text-6xl">
          Kerson & Carolina
        </h1>

        <div className="mx-auto my-5 h-px w-16 bg-gradient-to-r from-transparent via-gold-400 to-transparent" />

        <p className="font-serif text-xl italic text-sage-700 sm:text-2xl">
          ¡Nos casamos!
        </p>

        <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-gray-500 sm:text-base">
          Gracias por acompañarnos en este momento tan especial para nosotros.
          Aquí encontrarán la información de nuestra boda y nuestra lista de
          regalos para el té de cocina.
        </p>

        <div className="relative mx-auto mt-10 aspect-[3/4] max-w-sm overflow-hidden rounded-2xl sm:max-w-md">
          <Image
            src="/STD.png"
            alt="Kerson y Carolina — ilustración de nuestra boda"
            fill
            className="object-cover object-top"
            priority
            sizes="(max-width: 640px) 100vw, 400px"
          />
        </div>
      </div>
    </Section>
  );
}
