import { Card } from '@/components/ui/Card';
import { TemplateCard } from '@/components/home/TemplateCard';
import { SectionLink } from '@/components/home/SectionLink';
import { FEATURED_TEMPLATES } from '@/data/templates';

export function FeaturedTemplates() {
  return (
    <Card className="p-6 px-7">
      <div className="mb-[18px] flex items-baseline justify-between">
        <h3 className="m-0 text-[15px] font-semibold tracking-[-0.01em] text-ink">Templates em Destaque</h3>
        <SectionLink to="/templates" size="sm">
          Ver todos
        </SectionLink>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {FEATURED_TEMPLATES.map((template) => (
          <TemplateCard key={template.id} template={template} />
        ))}
      </div>
    </Card>
  );
}
