"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import type { SiteSettings } from "@prisma/client";

export default function DonateButton({
  settings,
  className,
}: {
  settings: SiteSettings;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"info" | "form" | "done">("info");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ donorName: "", donorPhone: "", donorEmail: "", amount: "" });

  // The modal is portaled to document.body (see below) so its `fixed`
  // positioning is always relative to the real viewport, regardless of any
  // ancestor (e.g. the header's backdrop-blur) that would otherwise create
  // its own containing block for fixed-position descendants and pin the
  // modal to the wrong spot. `open` only ever becomes true from a client-side
  // click, so `document` is guaranteed to exist whenever this portal renders.
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  function close() {
    setOpen(false);
    setStep("info");
    setError("");
    setForm({ donorName: "", donorPhone: "", donorEmail: "", amount: "" });
  }

  async function submitIntent(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const amountNum = Number(form.amount);
    if (!form.donorName.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!form.amount || Number.isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid donation amount.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: amountNum }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      setStep("done");
    } catch {
      setError("Something went wrong. Please try again or contact us directly.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={
          className ??
          "rounded-full bg-teal-700 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800"
        }
      >
        Donate Now
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={close}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h2 className="text-xl font-semibold text-stone-900">Support {settings.siteName}</h2>
              <button
                onClick={close}
                aria-label="Close"
                className="rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                ✕
              </button>
            </div>

            {step !== "done" && (
              <p className="mt-2 text-sm text-stone-600">{settings.donateNote}</p>
            )}

            {(step === "info" || step === "form") && (
              <>
                <div className="mt-5 flex flex-col items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
                  <Image
                    src={settings.qrImageUrl}
                    alt="Donation QR code"
                    width={220}
                    height={220}
                    className="h-56 w-56 rounded-lg bg-white object-contain p-2"
                  />
                  <a
                    href={`tel:${settings.contactNumber}`}
                    className="text-lg font-semibold text-teal-700"
                  >
                    {settings.contactNumber}
                  </a>
                  {settings.whatsappNumber && (
                    <a
                      href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-emerald-700 hover:underline"
                    >
                      Message us on WhatsApp
                    </a>
                  )}
                </div>

                {step === "info" && (
                  <button
                    onClick={() => setStep("form")}
                    className="mt-4 w-full rounded-lg border border-teal-700 px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50"
                  >
                    Let us know you&apos;re donating
                  </button>
                )}

                {step === "form" && (
                  <form onSubmit={submitIntent} className="mt-4 space-y-3">
                    <div>
                      <label className="text-xs font-medium text-stone-600">Your name</label>
                      <input
                        required
                        value={form.donorName}
                        onChange={(e) => setForm({ ...form, donorName: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-stone-600">Amount (₹)</label>
                        <input
                          required
                          type="number"
                          min="1"
                          value={form.amount}
                          onChange={(e) => setForm({ ...form, amount: e.target.value })}
                          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-stone-600">Phone</label>
                        <input
                          value={form.donorPhone}
                          onChange={(e) => setForm({ ...form, donorPhone: e.target.value })}
                          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-stone-600">Email (optional)</label>
                      <input
                        type="email"
                        value={form.donorEmail}
                        onChange={(e) => setForm({ ...form, donorEmail: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                      />
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
                    >
                      {submitting ? "Submitting…" : "Notify us"}
                    </button>
                  </form>
                )}
              </>
            )}

            {step === "done" && (
              <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-center">
                <p className="font-semibold text-emerald-800">Thank you, {form.donorName}!</p>
                <p className="mt-1 text-sm text-emerald-700">
                  We&apos;ve recorded your donation intent. Please complete the payment via the QR
                  code or by calling {settings.contactNumber}. Our team will confirm it shortly.
                </p>
                <button
                  onClick={close}
                  className="mt-4 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
