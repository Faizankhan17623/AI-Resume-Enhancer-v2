import ClassicTemplate from './ClassicTemplate'
import SidebarTemplate from './SidebarTemplate'
import ModernMinimal from './ModernMinimal'
import ExecutiveTemplate from './ExecutiveTemplate'
import CreativeTemplate from './CreativeTemplate'
import TechnicalTemplate from './TechnicalTemplate'
import CompactTemplate from './CompactTemplate'
import ElegantTemplate from './ElegantTemplate'
import BoldTemplate from './BoldTemplate'
import FreshGradTemplate from './FreshGradTemplate'
import TimelineTemplate from './TimelineTemplate'
import SplitTemplate from './SplitTemplate'

export const TEMPLATE_REGISTRY = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional single-column serif resume with a top banner',
    Component: ClassicTemplate,
  },
  {
    id: 'sidebar',
    name: 'Sidebar',
    description: 'Navy sidebar for contact and skills beside main content',
    Component: SidebarTemplate,
  },
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    description: 'Clean whitespace-heavy layout with thin dividing rules',
    Component: ModernMinimal,
  },
  {
    id: 'executive',
    name: 'Executive',
    description: 'Bold header band with confident two-column body',
    Component: ExecutiveTemplate,
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Accent color blocks with asymmetric photo-forward layout',
    Component: CreativeTemplate,
  },
  {
    id: 'technical',
    name: 'Technical',
    description: 'Skills-forward layout with monospace touches for engineers',
    Component: TechnicalTemplate,
  },
  {
    id: 'compact',
    name: 'Compact',
    description: 'Dense small-type layout maximizing content per page',
    Component: CompactTemplate,
  },
  {
    id: 'elegant',
    name: 'Elegant',
    description: 'Centered refined serif header with editorial spacing',
    Component: ElegantTemplate,
  },
  {
    id: 'bold',
    name: 'Bold',
    description: 'High-contrast dark header with geometric color accents',
    Component: BoldTemplate,
  },
  {
    id: 'fresh-grad',
    name: 'Fresh Graduate',
    description: 'Friendly education-forward layout for new graduates',
    Component: FreshGradTemplate,
  },
  {
    id: 'timeline',
    name: 'Timeline',
    description: 'Centered header with a dotted vertical timeline for experience',
    Component: TimelineTemplate,
  },
  {
    id: 'split',
    name: 'Split',
    description: 'Two-tone header band with a dense three-column body',
    Component: SplitTemplate,
  },
]

export const getTemplateById = (id) =>
  TEMPLATE_REGISTRY.find((t) => t.id === id) || TEMPLATE_REGISTRY[0]
