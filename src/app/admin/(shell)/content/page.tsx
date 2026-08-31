import { getSiteSettings } from "@/lib/settings";
import ContentForm from "@/components/admin/ContentForm";

export default async function AdminContentPage() {
  const settings = await getSiteSettings();
  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-900">Site Content</h1>
      <p className="mt-1 text-sm text-stone-500">
        Edit the text, images, and donate details shown on the public website.
      </p>
      <ContentForm settings={settings} />
    </div>
  );
}
