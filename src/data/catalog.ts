import type { Product } from '../types';

/** Standaardmeubels met realistische maten (cm) en richtprijzen ontbreken bewust. */
export const CATALOG: Product[] = [
  { id: 'cat_bank3', name: 'Bank (3-zits)', category: 'Woonkamer', width: 210, depth: 90, height: 85, color: '#6b7a8f', dimensionSource: 'catalogus' },
  { id: 'cat_bank2', name: 'Bank (2-zits)', category: 'Woonkamer', width: 160, depth: 88, height: 85, color: '#7d8ca3', dimensionSource: 'catalogus' },
  { id: 'cat_bed1', name: 'Bed (1-persoons)', category: 'Slaapkamer', width: 90, depth: 200, height: 50, color: '#c9b79c', dimensionSource: 'catalogus' },
  { id: 'cat_bed2', name: 'Bed (2-persoons)', category: 'Slaapkamer', width: 160, depth: 200, height: 50, color: '#bfa98a', dimensionSource: 'catalogus' },
  { id: 'cat_bed3', name: 'Bed (180 × 200)', category: 'Slaapkamer', width: 180, depth: 210, height: 55, color: '#b39b7a', dimensionSource: 'catalogus' },
  { id: 'cat_kast2', name: 'Kledingkast (2-deurs)', category: 'Slaapkamer', width: 100, depth: 58, height: 200, color: '#e8e2d6', dimensionSource: 'catalogus' },
  { id: 'cat_kast3', name: 'Kledingkast (3-deurs)', category: 'Slaapkamer', width: 150, depth: 58, height: 236, color: '#ddd5c4', dimensionSource: 'catalogus' },
  { id: 'cat_bureau', name: 'Bureau', category: 'Werkplek', width: 140, depth: 70, height: 75, color: '#a47551', dimensionSource: 'catalogus' },
  { id: 'cat_stoel_bureau', name: 'Bureaustoel', category: 'Werkplek', width: 65, depth: 65, height: 110, color: '#374151', dimensionSource: 'catalogus' },
  { id: 'cat_tafel4', name: 'Eettafel (4 pers.)', category: 'Eetkamer', width: 140, depth: 80, height: 75, color: '#9c6b43', dimensionSource: 'catalogus' },
  { id: 'cat_tafel6', name: 'Eettafel (6 pers.)', category: 'Eetkamer', width: 200, depth: 90, height: 75, color: '#8a5a36', dimensionSource: 'catalogus' },
  { id: 'cat_salontafel', name: 'Salontafel', category: 'Woonkamer', width: 110, depth: 60, height: 45, color: '#b08968', dimensionSource: 'catalogus' },
  { id: 'cat_stoel', name: 'Stoel', category: 'Eetkamer', width: 45, depth: 52, height: 85, color: '#d4a373', dimensionSource: 'catalogus' },
  { id: 'cat_stelling', name: 'Stellingkast', category: 'Opslag', width: 80, depth: 40, height: 180, color: '#9ca3af', dimensionSource: 'catalogus' },
  { id: 'cat_stelling_breed', name: 'Stellingkast (breed)', category: 'Opslag', width: 120, depth: 50, height: 200, color: '#8b929c', dimensionSource: 'catalogus' },
  { id: 'cat_werkbank', name: 'Werkbank', category: 'Werkplaats', width: 150, depth: 70, height: 90, color: '#b5651d', dimensionSource: 'catalogus' },
];
