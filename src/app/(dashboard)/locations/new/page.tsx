import { PageHeader } from "@/components/ui/page-header";
import { LocationForm } from "@/components/locations/location-form";

export default function NewLocationPage() {
  return (
    <div>
      <PageHeader
        title="Add Location"
        description="Create a new home or office to store inventory in"
      />
      <LocationForm />
    </div>
  );
}
