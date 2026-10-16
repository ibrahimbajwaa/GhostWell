import Link from "next/link";
import { Page, PageHeader } from "@/components/Section";

export default function NotFound() {
  return (
    <Page>
      <PageHeader eyebrow="404" title="Nothing here">
        This page doesn&apos;t exist. <Link href="/" className="text-ink underline">Back to the map</Link>.
      </PageHeader>
    </Page>
  );
}
