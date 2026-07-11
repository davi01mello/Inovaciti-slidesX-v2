import { Hero } from '@/components/home/Hero';
import { QuickActions } from '@/components/home/QuickActions';
import { RecentPresentations } from '@/components/home/RecentPresentations';
import { FeaturedTemplates } from '@/components/home/FeaturedTemplates';
import { OverviewPanel } from '@/components/home/OverviewPanel';
import { RecentActivity } from '@/components/home/RecentActivity';

export function HomePage() {
  return (
    <>
      <Hero />
      <QuickActions />
      <RecentPresentations />
      <section className="grid grid-cols-[1.35fr_1fr_1fr] gap-6">
        <FeaturedTemplates />
        <OverviewPanel />
        <RecentActivity />
      </section>
    </>
  );
}
