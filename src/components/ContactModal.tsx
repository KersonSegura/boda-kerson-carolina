"use client";

import { useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { Modal } from "./Modal";

const CONTACTS = [
  { name: "Kerson Segura", phone: "8528 0056" },
  { name: "Carolina Vargas", phone: "8688 2982" },
] as const;

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
}

export function ContactModal({ open, onClose }: ContactModalProps) {
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  const copyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      setCopiedPhone(phone);
      setTimeout(() => setCopiedPhone(null), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = phone;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedPhone(phone);
      setTimeout(() => setCopiedPhone(null), 2000);
    }
  };

  return (
    <Modal open={open} onClose={onClose} ariaLabelledBy="contact-title">
      <div className="mb-5 flex items-start justify-between gap-3">
        <h2 id="contact-title" className="font-serif text-2xl text-sage-900">
          Contacto
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2 text-sage-600 hover:bg-beige-100"
          aria-label="Cerrar"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <p className="mb-5 text-base text-sage-700">
        Toca un número para copiarlo al portapapeles.
      </p>

      <ul className="space-y-3">
        {CONTACTS.map((contact) => {
          const isCopied = copiedPhone === contact.phone;

          return (
            <li key={contact.name}>
              <button
                type="button"
                onClick={() => copyPhone(contact.phone)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border-2 border-beige-200 bg-beige-50 px-4 py-4 text-left transition-colors hover:border-sage-300 hover:bg-white active:scale-[0.99]"
              >
                <div>
                  <p className="text-base font-semibold text-sage-900">
                    {contact.name}
                  </p>
                  <p className="mt-1 text-lg font-medium text-sage-700">
                    {contact.phone}
                  </p>
                </div>
                <span className="shrink-0 text-sage-600">
                  {isCopied ? (
                    <Check className="h-5 w-5 text-emerald-700" />
                  ) : (
                    <Copy className="h-5 w-5" />
                  )}
                </span>
              </button>
              {isCopied && (
                <p className="mt-2 text-center text-base font-medium text-emerald-700">
                  Número copiado
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
