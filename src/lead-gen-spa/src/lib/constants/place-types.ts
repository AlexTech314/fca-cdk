export const PLACE_TYPES: Array<{ category: string; types: string[] }> = [
  {
    category: 'Services',
    types: [
      'plumber', 'electrician', 'hvac_contractor', 'roofing_contractor', 'general_contractor',
      'painter', 'landscaper', 'pest_control', 'locksmith', 'moving_company',
      'cleaning_service', 'handyman', 'carpet_cleaning', 'window_cleaning',
      'garage_door_service', 'fence_contractor', 'tree_service', 'appliance_repair',
      'pool_service', 'pressure_washing',
    ],
  },
  {
    category: 'Finance',
    types: [
      'accounting_firm', 'financial_advisor', 'insurance_agency', 'tax_preparation',
      'mortgage_broker', 'bank', 'credit_union', 'investment_company',
    ],
  },
  {
    category: 'Automotive',
    types: [
      'auto_body_shop', 'auto_repair', 'car_dealer', 'car_wash', 'tire_shop',
      'oil_change_service', 'auto_glass', 'towing_service', 'auto_detailing',
    ],
  },
  {
    category: 'Health & Medical',
    types: [
      'dentist', 'doctor', 'chiropractor', 'optometrist', 'veterinarian',
      'physical_therapist', 'pharmacy', 'urgent_care', 'dermatologist',
      'mental_health', 'orthodontist', 'pediatrician', 'massage_therapist',
      'acupuncture', 'medical_spa',
    ],
  },
  {
    category: 'Food & Dining',
    types: [
      'restaurant', 'pizza_restaurant', 'bakery', 'cafe', 'bar',
      'fast_food_restaurant', 'coffee_shop', 'ice_cream_shop', 'catering',
      'food_truck', 'juice_bar', 'brewery',
    ],
  },
  {
    category: 'Shopping & Retail',
    types: [
      'clothing_store', 'jewelry_store', 'furniture_store', 'hardware_store',
      'pet_store', 'florist', 'gift_shop', 'sporting_goods', 'electronics_store',
      'book_store', 'thrift_store', 'bicycle_shop',
    ],
  },
  {
    category: 'Lodging & Travel',
    types: [
      'hotel', 'motel', 'bed_and_breakfast', 'rv_park', 'campground',
      'travel_agency', 'vacation_rental',
    ],
  },
  {
    category: 'Entertainment & Recreation',
    types: [
      'gym', 'yoga_studio', 'martial_arts_school', 'dance_studio',
      'bowling_alley', 'movie_theater', 'amusement_park', 'golf_course',
      'spa', 'tattoo_shop', 'nail_salon', 'hair_salon', 'barber_shop',
    ],
  },
  {
    category: 'Education',
    types: [
      'school', 'tutoring_service', 'driving_school', 'music_school',
      'preschool', 'daycare', 'art_school', 'language_school',
    ],
  },
  {
    category: 'Real Estate',
    types: [
      'real_estate_agency', 'property_management', 'home_builder',
      'home_inspector', 'title_company', 'real_estate_appraiser',
    ],
  },
  {
    category: 'Legal',
    types: [
      'law_firm', 'attorney', 'notary_public', 'bail_bonds',
      'immigration_lawyer', 'divorce_lawyer',
    ],
  },
  {
    category: 'Technology',
    types: [
      'it_service', 'computer_repair', 'web_design', 'software_company',
      'phone_repair', 'security_system', 'printing_service',
    ],
  },
  {
    category: 'Industrial & Commercial',
    types: [
      'warehouse', 'trucking_company', 'construction_company',
      'manufacturing', 'welding_shop', 'machine_shop', 'janitorial_service',
    ],
  },
];

export const ALL_PLACE_TYPES: string[] = PLACE_TYPES.flatMap((c) => c.types);

export function formatPlaceType(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export const REGIONAL_PRESETS: Array<{ label: string; stateIds: string[] }> = [
  {
    label: 'All 50',
    stateIds: [
      'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
      'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
      'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
      'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
      'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
    ],
  },
  {
    label: 'Continental 48',
    stateIds: [
      'AL','AZ','AR','CA','CO','CT','DE','FL','GA',
      'ID','IL','IN','IA','KS','KY','LA','ME','MD',
      'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
      'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
      'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
    ],
  },
  {
    label: 'East Coast',
    stateIds: ['ME','NH','VT','MA','RI','CT','NY','NJ','PA','DE','MD','VA','NC','SC','GA','FL'],
  },
  {
    label: 'West Coast',
    stateIds: ['WA','OR','CA'],
  },
  {
    label: 'Midwest',
    stateIds: ['OH','MI','IN','IL','WI','MN','IA','MO','ND','SD','NE','KS'],
  },
  {
    label: 'South',
    stateIds: ['TX','OK','AR','LA','MS','AL','TN','KY','WV','VA','NC','SC','GA','FL'],
  },
  {
    label: 'Southwest',
    stateIds: ['AZ','NM','TX','OK','NV','UT','CO'],
  },
  {
    label: 'Northeast',
    stateIds: ['ME','NH','VT','MA','RI','CT','NY','NJ','PA'],
  },
];

export const CITY_LIMITS = [10, 25, 50, 100, 250, 500, 1000, -1] as const;
