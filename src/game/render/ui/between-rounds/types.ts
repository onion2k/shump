import type { ReactNode } from 'react';
import type { CardDefinition } from '../../../content/cards';

export interface BetweenRoundsTab {
  id: string;
  label: string;
  screen: string;
}

export interface FractionColumnSlot {
  id: string;
  fraction: number;
  content: ReactNode;
}

export type CardRenderModel = Pick<CardDefinition, 'id' | 'name' | 'description' | 'rarity' | 'tags'>;
