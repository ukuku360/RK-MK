import type { BrandVariant, BuildingConfig, BuildingKey, EventPreset } from '../types';

export const ROOMINGKOS_EVENT_PRESET: EventPreset = {
  title: 'RoomingKos Mario Kart Cup',
  subtitle: 'Race through four groups, reach the final, and finish on the podium.',
  shareText: 'Claim a grid slot for the 16-driver Mario Kart group stage at RoomingKos.',
  publicViewLabel: 'Drivers',
  adminViewLabel: 'Race Control',
  registrationTitle: 'Driver Registration',
  registrationFields: {
    nameLabel: 'Driver Name',
    namePlaceholder: 'e.g. Minji',
    nicknameLabel: 'Racer Tag',
    nicknamePlaceholder: 'e.g. Bullet Bill',
    teamTagLabel: 'Unit Number',
    teamTagPlaceholder: 'e.g. 1203',
  },
  entryListTitle: 'Drivers',
  countLabel: 'Drivers',
  checkedInLabel: 'Checked In',
  waitlistLabel: 'Pit Lane',
  waitlistNote: 'Overflow signups queue here until a grid slot opens.',
  summaryTitle: 'Event Summary',
  summaryLead: '16 drivers. 4 groups. 1 final.',
  summaryDateLabel: 'Race Day',
  summaryDateLong: 'Monday, May 5',
  summaryTimeLabel: '6 PM start',
  summaryTimezoneLabel: 'Melbourne time',
  summaryStatusLabel: 'Registration status',
  summaryStatusDescriptions: {
    open: 'Registrations are open across all remaining slots.',
    nearlyFull: 'Only a few slots remain before Pit Lane opens.',
    full: 'Grid is full. New signups will be queued in Pit Lane.',
    locked: 'The draw is locked and registrations are no longer open.',
  },
  championHeading: 'Grand Prix Champion',
  championAnnouncementPrefix: 'Victory Lap',
  resultFilePrefix: 'roomingkos-mario-kart-result',
  resultShareTitle: 'RoomingKos Mario Kart Result',
  resultShareText: 'Mario Kart tournament result poster',
  podiumShareButtonText: 'Share Result',
  matchModalKicker: 'Race Ranking',
  thirdPlaceTitle: 'Tie-break',
  resultsButtonLabel: 'Open Podium',
  bracketHeading: 'Groups & Final',
  entryMetaLabel: 'Grid',
  waitlistMetaLabel: 'Pit Lane',
  slotMetaLabel: 'Grid Slot',
  prizes: [
    {
      tier: '1st',
      amount: '$50',
      detail: 'Woolworths gift card',
      className: 'prize-card prize-card-first',
    },
    {
      tier: '2nd',
      amount: '$30',
      detail: 'Woolworths gift card',
      className: 'prize-card prize-card-second',
    },
    {
      tier: '3rd',
      amount: '$20',
      detail: 'Woolworths gift card',
      className: 'prize-card prize-card-third',
    },
  ],
  eventDate: {
    monthShort: 'MAY',
    day: '05',
  },
};

export const SPIRE_EVENT_PRESET: EventPreset = {
  title: 'Spire Mario Kart Cup',
  subtitle:
    'Race through four qualifier groups, earn a seat in the final, and finish on the podium.',
  shareText: 'Claim a seat in the 16-resident Mario Kart night at Spire.',
  publicViewLabel: 'Residents',
  adminViewLabel: 'Race Control',
  registrationTitle: 'Resident Registration',
  registrationFields: {
    nameLabel: 'Resident Name',
    namePlaceholder: 'e.g. Minji',
    nicknameLabel: 'Kart Alias',
    nicknamePlaceholder: 'e.g. Green Shell',
    teamTagLabel: 'Unit Number',
    teamTagPlaceholder: 'e.g. 1203',
  },
  entryListTitle: 'Residents',
  countLabel: 'Residents',
  checkedInLabel: 'Checked In',
  waitlistLabel: 'Waitlist',
  waitlistNote: 'When the field is full, new residents queue here until a seat opens.',
  summaryTitle: 'Event Overview',
  summaryLead: '16 residents. 4 qualifier groups. 1 championship final.',
  summaryDateLabel: 'Race Night',
  summaryDateLong: 'Monday, May 5',
  summaryTimeLabel: '6 PM start',
  summaryTimezoneLabel: 'Melbourne time',
  summaryStatusLabel: 'Registration status',
  summaryStatusDescriptions: {
    open: 'Registrations are open across the remaining race-night seats.',
    nearlyFull: 'Only a few seats remain before the waitlist opens.',
    full: 'The field is full. New residents will join the waitlist.',
    locked: 'The qualifying draw is locked and registrations are closed.',
  },
  championHeading: 'Spire Champion',
  championAnnouncementPrefix: 'Winner',
  resultFilePrefix: 'spire-mario-kart-result',
  resultShareTitle: 'Spire Mario Kart Result',
  resultShareText: 'Spire tournament result poster',
  podiumShareButtonText: 'Share Result',
  matchModalKicker: 'Race Ranking',
  thirdPlaceTitle: 'Tie-break',
  resultsButtonLabel: 'Open Podium',
  bracketHeading: 'Qualifiers & Final',
  entryMetaLabel: 'Seat',
  waitlistMetaLabel: 'Waitlist',
  slotMetaLabel: 'Seat',
  prizes: [
    {
      tier: '1st',
      amount: '$50',
      detail: 'Woolworths gift card',
      className: 'prize-card prize-card-first',
    },
    {
      tier: '2nd',
      amount: '$30',
      detail: 'Woolworths gift card',
      className: 'prize-card prize-card-second',
    },
    {
      tier: '3rd',
      amount: '$20',
      detail: 'Woolworths gift card',
      className: 'prize-card prize-card-third',
    },
  ],
  eventDate: {
    monthShort: 'MAY',
    day: '05',
  },
};

export const EVENT_PRESET = ROOMINGKOS_EVENT_PRESET;
export const EVENT_PRESETS: Record<BrandVariant, EventPreset> = {
  roomingkos: ROOMINGKOS_EVENT_PRESET,
  spire: SPIRE_EVENT_PRESET,
};

export const BUILDING_KEYS = ['swanston', 'dudely', 'spire'] as const satisfies readonly BuildingKey[];

export const BUILDING_CONFIGS: Record<BuildingKey, BuildingConfig> = {
  swanston: {
    key: 'swanston',
    path: '/swanston',
    label: 'RoomingKos Swanston',
    headline: 'RoomingKos Swanston Mario Kart Cup',
    eventId: 'rk-mario-kart-swanston',
    brandVariant: 'roomingkos',
  },
  dudely: {
    key: 'dudely',
    path: '/dudely',
    label: 'RoomingKos Dudely',
    headline: 'RoomingKos Dudely Mario Kart Cup',
    eventId: 'rk-mario-kart-dudely',
    brandVariant: 'roomingkos',
  },
  spire: {
    key: 'spire',
    path: '/spire',
    label: 'Spire',
    headline: 'Spire Mario Kart Cup',
    eventId: 'rk-mario-kart-spire',
    brandVariant: 'spire',
  },
};

export const BUILDINGS = BUILDING_KEYS.map((key) => BUILDING_CONFIGS[key]);

export function getEventPreset(buildingOrVariant: BuildingConfig | BrandVariant) {
  const brandVariant =
    typeof buildingOrVariant === 'string'
      ? buildingOrVariant
      : buildingOrVariant.brandVariant;

  return EVENT_PRESETS[brandVariant];
}
