import type { Metadata } from "next";
import Lookup from "@/components/Lookup";
import { Page, PageHeader } from "@/components/Section";

export const metadata: Metadata = { title: "Landowner lookup · Ghostwell" };

const STEPS = [
  {
    title: "Not getting paid for a well on your land?",
    body: (
      <>
        If the operator stopped paying surface lease rent, you can apply to the{" "}
        <a className="underline decoration-white/30 underline-offset-2" href="https://www.alberta.ca/land-and-property-rights-tribunal" target="_blank" rel="noreferrer">
          Land and Property Rights Tribunal
        </a>{" "}
        under section 36 of the Surface Rights Act to recover it. Have your land description, the well licence number and your
        lease ready. You file once per lease, every year.
      </>
    ),
  },
  {
    title: "Well is orphaned?",
    body: (
      <>
        The{" "}
        <a className="underline decoration-white/30 underline-offset-2" href="https://www.orphanwell.ca/" target="_blank" rel="noreferrer">
          Orphan Well Association
        </a>{" "}
        is responsible for closing it. Their interactive map shows which cleanup stage your site is in and which contractor is
        assigned.
      </>
    ),
  },
  {
    title: "Smell gas, see a leak or damage?",
    body: (
      <>
        Call the AER&apos;s Energy and Environmental 24-hour Response Line at{" "}
        <a className="num underline decoration-white/30 underline-offset-2" href="tel:18002226514">
          1-800-222-6514
        </a>
        . In an emergency, call 911 first.
      </>
    ),
  },
];

export default function LookupPage() {
  return (
    <Page>
      <PageHeader eyebrow="For landowners" title="Is there an inactive well near your land?">
        Thousands of Alberta farmers and acreage owners have wells on their property that stopped producing years ago. Enter your
        legal land description to see every inactive or orphaned well nearby, who&apos;s responsible for it and how risky it is.
      </PageHeader>
      <Lookup />
      <section className="mt-12">
        <h2 className="text-lg font-medium">What you can do</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.title} className="rounded-xl border border-line bg-panel p-4">
              <div className="font-medium">{s.title}</div>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{s.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-ink-3">
          This is general information, not legal advice. Well positions are approximate (converted from survey coordinates), so
          confirm details with the AER before acting.
        </p>
      </section>
    </Page>
  );
}
