import type { AdminPostBlockContent } from '@/lib/adminPosts';

export type QuickFactCategory = 'diving' | 'travel';

export type QuickFactField = {
  key: keyof AdminPostBlockContent;
  label: string;
  placeholder?: string;
  category: QuickFactCategory;
  options?: string[];
};

export type QuickFactItem = {
  key: string;
  label: string;
  value: string;
  category?: QuickFactCategory;
};

export const quickFactFields: QuickFactField[] = [
  {
    key: 'waterTemperature',
    label: 'Water temperature',
    placeholder: '18 - 26°C',
    category: 'diving',
  },
  {
    key: 'visibility',
    label: 'Visibility',
    placeholder: '10 - 20m',
    category: 'diving',
  },
  {
    key: 'diveLevel',
    label: 'Dive level',
    category: 'diving',
    options: ['Beginner', 'Intermediate', 'Advanced', 'All levels'],
  },
  {
    key: 'mainMarineLife',
    label: 'Main marine life',
    placeholder: 'Hammerheads, Manta Rays, Sea Turtles',
    category: 'diving',
  },
  {
    key: 'bestDiveMonths',
    label: 'Best dive months',
    placeholder: 'January - May',
    category: 'diving',
  },
  {
    key: 'typicalDiveCost',
    label: 'Typical dive cost',
    placeholder: '$150 - $250 per day',
    category: 'diving',
  },
  {
    key: 'bestTimeToVisit',
    label: 'Best time to visit',
    placeholder: 'December - April',
    category: 'travel',
  },
  {
    key: 'recommendedStay',
    label: 'Recommended stay',
    placeholder: '7 - 10 days',
    category: 'travel',
  },
  {
    key: 'currency',
    label: 'Currency',
    placeholder: 'USD',
    category: 'travel',
  },
  {
    key: 'budgetLevel',
    label: 'Budget level',
    category: 'travel',
    options: ['$ Budget', '$$ Mid-range', '$$$ Expensive'],
  },
  {
    key: 'gettingThere',
    label: 'Getting there',
    placeholder: 'Fly into Guayaquil, then domestic to Baltra',
    category: 'travel',
  },
  {
    key: 'visaRequired',
    label: 'Visa required',
    category: 'travel',
    options: ['Yes', 'No', 'Check your nationality'],
  },
];

export function getQuickFactItems(content: AdminPostBlockContent): QuickFactItem[] {
  const customItems = (content.quickFactItems ?? [])
    .map((item, index) => ({
      key: `custom-${index}`,
      label: item.label?.trim() ?? '',
      value: item.value?.trim() ?? '',
    }))
    .filter((item) => item.label && item.value);

  if (customItems.length > 0) return customItems;

  return quickFactFields
    .map((field) => {
      const rawValue = content[field.key];
      const value = typeof rawValue === 'string' ? rawValue.trim() : '';

      return {
        key: String(field.key),
        label: field.label,
        value,
        category: field.category,
      };
    })
    .filter((item) => item.value);
}
