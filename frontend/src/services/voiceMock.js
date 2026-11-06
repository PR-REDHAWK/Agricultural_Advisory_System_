// ILLUSTRATIVE DATA ONLY. Used when VITE_VOICE_MOCK=true (dev). Never ship as real forecast data.
export const MOCK_TRANSCRIPT = {
  transcript: 'Patna mein dhaan ki buwai ke liye agle hafte baarish kaisi rahegi?',
  language: 'hi-IN',
  duration: 6.2,
};

export const MOCK_ASK = {
  answer:
    'Agle 14 din mein Patna mein dry spell ka khatra zyada hai. Dhaan ki buwai tab tak taalein jab tak baarish na aaye.',
  conversation_id: 'mock-conv-1',
  extracted_context: { location: 'Patna', crop: 'Rice', growth_stage: 'Sowing', forecast_horizon: '14D' },
  forecast_context: {
    onset_probability: 0.3,
    break_spell_probability: 1.0,
    heavy_rain_probability: 0.0, // a genuine 0% must render as 0%, not "Unavailable"
    risk_level: 'high',
    event_type: 'Break spell',
    match: { station: 'Patna', confidence: 0.88 },
  },
  advisory: {
    title: 'High Dry-Spell Risk',
    primary_action:
      'Delay rain-dependent Rice transplanting/sowing. Keep paddy nurseries hydrated under light irrigation.',
    supporting_actions: ['Use wet seedbed method for paddy nursery', 'Apply protective shade cover during peak dry hours'],
  },
  requires_clarification: false,
  clarification_prompt: null,
};

export const MOCK_CLARIFY = {
  answer: '',
  conversation_id: 'mock-conv-1',
  extracted_context: { location: null, crop: null, growth_stage: null, forecast_horizon: null },
  forecast_context: null,
  advisory: null,
  requires_clarification: true,
  clarification_prompt: 'Aap kaunsi fasal ke baare mein poochh rahe hain, aur kis zile mein?',
};
