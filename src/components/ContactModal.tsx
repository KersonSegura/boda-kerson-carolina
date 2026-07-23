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
        <h2 id="contact-title" className="font-serif text-xl text-sage-900">
          Contacto
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-gray-400 hover:bg-beige-100 hover:text-gray-600"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <p className="mb-4 text-sm text-gray-500">
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
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-beige-200 bg-beige-50 px-4 py-3 text-left transition-colors hover:border-sage-200 hover:bg-white active:scale-[0.99]"
              >
                <div>
                  <p className="text-sm font-medium text-sage-900">
                    {contact.name}
                  </p>
                  <p className="mt-0.5 text-sm text-sage-600">{contact.phone}</p>
                </div>
                <span className="shrink-0 text-sage-500">
                  {isCopied ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </span>
              </button>
              {isCopied && (
                <p className="mt-1 text-center text-xs text-emerald-600">
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
